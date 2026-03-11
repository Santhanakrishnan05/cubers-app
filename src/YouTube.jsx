import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
import { useSocket } from './context/SocketContext';
import { useApp } from './context/AppContext';

const YouTube = ({ onClose, roomId }) => {
  const { socket } = useSocket();
  const { selectedRoom, currentUser, currentYoutubeVideo, setCurrentYoutubeVideo } = useApp();
  const iframeRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const isHost = selectedRoom?.hostId === currentUser?.id;
  const [searchQuery, setSearchQuery] = useState('');
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [currentVideoState, setCurrentVideoState] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (query) => {
    if (!query.trim()) {
      setVideos([]);
      setError('');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Call backend API to search YouTube directly
      const response = await fetch(
        `${BACKEND_URL}/api/youtube/search?q=${encodeURIComponent(query)}`
      );

      const result = await response.json();

      if (result.success && result.videos && result.videos.length > 0) {
        setVideos(result.videos);
        setError('');
      } else if (result.videos && result.videos.length === 0) {
        setVideos([]);
        setError('No videos found. Try a different search.');
      } else {
        setVideos([]);
        setError(result.error || 'Search failed');
      }
    } catch (err) {
      console.error('Search error:', err);
      setVideos([]);
      setError('Failed to search YouTube. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Debounce search by 500ms
    searchTimeoutRef.current = setTimeout(() => {
      handleSearch(query);
    }, 500);
  };

  // Sync global YouTube video state with local selectedVideo
  useEffect(() => {
    if (currentYoutubeVideo) {
      console.log('🎬 [YouTube Component] Syncing currentYoutubeVideo:', currentYoutubeVideo.id);
      setSelectedVideo(currentYoutubeVideo);
    }
  }, [currentYoutubeVideo]);

  // Global YouTube sync listener (listens even before YouTube section is opened)
  useEffect(() => {
    if (!socket) return;

    const handleGlobalSync = (syncData) => {
      console.log('📺 [GLOBAL LISTENER] YouTube sync received:', syncData);
      console.log('📺 [GLOBAL LISTENER] Video ID:', syncData?.videoId);
      console.log('📺 [GLOBAL LISTENER] Current selectedVideo ID:', selectedVideo?.id);
      
      if (syncData && syncData.videoId) {
        // Always update currentVideoState
        setCurrentVideoState(syncData);
        
        // Always create a fresh video object with sync data
        // This ensures all users get the new video immediately
        const updatedVideo = {
          id: syncData.videoId,
          title: syncData.title || 'Unknown Title',
          channel: syncData.channel || 'Unknown',
          url: syncData.url,
          snippet: {
            title: syncData.title || 'Unknown Title',
            channelTitle: syncData.channel || 'Unknown',
            thumbnails: { default: { url: '' } }
          }
        };
        
        console.log('🎬 [GLOBAL LISTENER] Setting selectedVideo to:', updatedVideo.id);
        setSelectedVideo(updatedVideo);
        setCurrentYoutubeVideo(updatedVideo);
        console.log('✅ [GLOBAL LISTENER] State updated successfully');
      } else if (syncData && !syncData.videoId) {
        // No video is playing
        console.log('⏹️ [GLOBAL LISTENER] Clearing video');
        setSelectedVideo(null);
        setCurrentVideoState(null);
        setCurrentYoutubeVideo(null);
      }
    };

    console.log('📺 [GLOBAL LISTENER] Attaching youtube-sync listener');
    socket.on('youtube-sync', handleGlobalSync);

    return () => {
      console.log('📺 [GLOBAL LISTENER] Detaching youtube-sync listener');
      socket.off('youtube-sync', handleGlobalSync);
    };
  }, [socket, setCurrentYoutubeVideo]);

  // Socket.io YouTube sync
  useEffect(() => {
    if (!socket || !selectedRoom) return;

    const handlePlay = ({ videoId, currentTime }) => {
      // Find video in current list or set it
      const video = videos.find(v => v.id === videoId);
      if (video) {
        setSelectedVideo(video);
        setIsSyncing(true);
      }
    };

    const handlePause = () => {
      setIsSyncing(false);
    };

    const handleSeek = ({ currentTime }) => {
      setIsSyncing(true);
    };

    // Attach listeners
    socket.on('youtube-play', handlePlay);
    socket.on('youtube-pause', handlePause);
    socket.on('youtube-seek', handleSeek);
    // Note: youtube-sync is handled by global listener above

    // Request current YouTube state when entering the section
    console.log('📺 Requesting YouTube state for room:', selectedRoom.id);
    socket.emit('youtube-sync-request', { roomId: selectedRoom.id });

    return () => {
      socket.off('youtube-play', handlePlay);
      socket.off('youtube-pause', handlePause);
      socket.off('youtube-seek', handleSeek);
    };
  }, [socket, selectedRoom?.id]); // Only depend on room ID, not entire room object

  const handleVideoSelect = (video) => {
    // Only host can control YouTube
    if (!isHost) {
      return; // Silently ignore - UI is already disabled
    }

    setSelectedVideo(video);
    // Broadcast video selection to all participants
    if (socket && selectedRoom) {
      console.log('📺 Host selected video:', video.id);
      socket.emit('youtube-play', {
        roomId: selectedRoom.id,
        videoId: video.id,
        title: video.title,
        url: video.url,
        channel: video.channel || video.snippet?.channelTitle || 'Unknown',
        currentTime: 0,
        hostId: currentUser?.id // Add host ID for verification
      });
    }
  };

  // Handle play/pause controls (host only)
  const handlePlay = () => {
    if (!isHost || !selectedVideo) return;
    if (socket && selectedRoom) {
      socket.emit('youtube-play', {
        roomId: selectedRoom.id,
        videoId: selectedVideo.id,
        currentTime: 0 // Would need YouTube API for actual time
      });
    }
  };

  const handlePause = () => {
    if (!isHost) return;
    if (socket && selectedRoom) {
      socket.emit('youtube-pause', { roomId: selectedRoom.id });
    }
  };

  // Render for non-host users - Clean video viewer with title below
  if (!isHost) {
    return (
      <div className="flex-1 flex flex-col p-4 h-full bg-gradient-to-br from-slate-950 to-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold text-lg">Watch Together</h2>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-lg bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors flex-shrink-0"
            title="Close YouTube"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Video takes full width */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedVideo ? (
            <div className="flex-1 flex flex-col bg-slate-800 rounded-xl shadow-2xl overflow-hidden border border-slate-700">
              {/* Video player - takes most space */}
              <div className="flex-1 bg-black overflow-hidden relative min-h-0">
                <iframe
                  key={selectedVideo?.id}
                  ref={iframeRef}
                  width="100%"
                  height="100%"
                  src={`${selectedVideo.url}?autoplay=1&enablejsapi=1`}
                  title={selectedVideo.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full"
                ></iframe>
              </div>
              
              {/* Title and channel below video */}
              <div className="p-4 bg-slate-800 border-t border-slate-700">
                <h3 className="text-white font-bold text-lg leading-tight line-clamp-1 mb-1">
                  {selectedVideo.title}
                </h3>
                <p className="text-slate-400 text-sm">
                  {selectedVideo.channel}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-slate-800 rounded-xl shadow-2xl overflow-hidden border border-slate-700">
              <div className="text-center">
                <p className="text-6xl mb-4">🎬</p>
                <p className="text-slate-400 mb-2">Waiting for host to select a video...</p>
                <p className="text-slate-500 text-sm">The video will appear here automatically</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Render for host users - Full control interface
  return (
    <div className="flex-1 flex flex-col p-4 h-full">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        {isHost ? (
          <div className="flex-1 bg-slate-900 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-4">
              <Search className="w-5 h-5 text-blue-400" />
              <span className="text-white font-semibold text-lg">YouTube Search</span>
            </div>
            <input
              type="text"
              placeholder="Search videos from YouTube... (java, python, react, etc)"
              value={searchQuery}
              onChange={handleSearchChange}
              className={`w-full px-4 py-3 rounded-lg bg-slate-800 text-white placeholder-slate-400 border border-slate-700 focus:outline-none focus:border-blue-400`}
            />
            <p className="text-xs text-slate-500 mt-2">🔍 Searching YouTube directly for real-time results...</p>
          </div>
        ) : (
          <div className="flex-1 bg-slate-900 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-white font-semibold text-lg">YouTube Playback</span>
              <span className="text-xs text-yellow-400 bg-yellow-900/30 px-2 py-1 rounded">Host Controlled</span>
            </div>
            <p className="text-sm text-slate-400">👑 Host is controlling the video playback. Watch along with the group!</p>
          </div>
        )}
        <button 
          onClick={onClose}
          className="ml-4 w-10 h-10 rounded-lg bg-red-500 flex items-center justify-center hover:bg-red-600 flex-shrink-0"
          title="Close YouTube"
        >
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Video Display Area */}
      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Video Player */}
        <div className="flex-1 flex flex-col bg-slate-900 rounded-xl p-4 overflow-hidden">
          {selectedVideo ? (
            <>
              <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
                <iframe
                  key={selectedVideo?.id}
                  ref={iframeRef}
                  width="100%"
                  height="100%"
                  src={`${selectedVideo.url}?autoplay=1&enablejsapi=1`}
                  title={selectedVideo.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                ></iframe>
              </div>

            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-5xl mb-4">🎬</p>
                <p className="text-slate-400">Select a video to watch</p>
              </div>
            </div>
          )}
        </div>

        {/* Video List - Only for Host */}
        {/* Video List - Only for Host */}
        <div className="w-80 bg-slate-900 rounded-xl p-4 overflow-y-auto">
          {loading && (
            <div className="text-center py-4">
              <p className="text-slate-400">🔍 Searching YouTube...</p>
              <p className="text-slate-500 text-sm mt-2">Please wait</p>
            </div>
          )}
          {error && (
            <div className="text-red-400 text-sm p-3 bg-red-900/20 rounded-lg mb-4">
              {error}
            </div>
          )}

          {videos.length > 0 ? (
            <div className="space-y-3">
              <p className="text-slate-400 text-xs mb-3">Found {videos.length} videos</p>
              {videos.map((video) => (
                <button
                  key={video.id}
                  onClick={() => handleVideoSelect(video)}
                  className={`w-full text-left rounded-lg overflow-hidden transition hover:ring-2 hover:ring-blue-400 ${
                    selectedVideo?.id === video.id ? 'ring-2 ring-blue-400' : ''
                  }`}
                >
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-full h-24 object-cover rounded-lg mb-2"
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/320x180?text=Video';
                    }}
                  />
                  <p className="text-white text-sm font-medium line-clamp-2 px-1">
                    {video.title}
                  </p>
                  <p className="text-slate-400 text-xs px-1 line-clamp-1">
                    {video.channel}
                  </p>
                </button>
              ))}
            </div>
          ) : searchQuery && !loading ? (
            <div className="text-center py-4">
              <Search className="w-12 h-12 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-400">No videos found</p>
              <p className="text-slate-500 text-xs mt-2">Try another search</p>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-slate-500">Search to see YouTube videos</p>
              <p className="text-slate-600 text-xs mt-2">Real-time results from YouTube</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default YouTube;
