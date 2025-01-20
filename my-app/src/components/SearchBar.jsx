/**
 * SearchBar Component
 * 
 * A versatile search component that provides real-time suggestions for users and channels.
 * Features a dynamic dropdown with categorized results and support for global search.
 * 
 * Features:
 * - Real-time search suggestions
 * - User and channel search
 * - Global search capability
 * - Keyboard navigation support
 * - Styled dropdown with categories
 * 
 * @component
 * @param {Object} props
 * @param {Array} props.users - Array of user objects to search through
 * @param {Array} props.channels - Array of channel objects to search through
 * @param {Function} props.onUserSelect - Callback when a user is selected
 * @param {Function} props.onChannelSelect - Callback when a channel is selected
 * @param {Function} props.onSearch - Callback for global search
 */

import React, { useState, useRef } from 'react';
import {
  Box,
  TextField,
  Typography,
  Paper,
  MenuItem,
  Avatar,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import TagIcon from '@mui/icons-material/Tag';
import { getAvatarColor } from '../utils/colors';

export default function SearchBar({ 
  users, 
  channels, 
  onUserSelect, 
  onChannelSelect, 
  onSearch 
}) {
  // State Management
  const [searchQuery, setSearchQuery] = useState(''); // Current search text
  const [isSearchFocused, setIsSearchFocused] = useState(false); // Focus state for styling
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false); // Dropdown visibility
  const searchBoxRef = useRef(null); // Reference for click outside detection

  // Filter suggestions based on search query
  const userSuggestions = users.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 3);

  const channelSuggestions = channels.filter(channel => 
    channel.name.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 3);

  /**
   * Handles search input focus
   * Shows suggestions dropdown
   */
  const handleSearchFocus = () => {
    setIsSearchFocused(true);
    setShowSearchSuggestions(true);
  };

  /**
   * Handles search input blur
   * Hides suggestions if click is outside search area
   * @param {Event} e - Blur event
   */
  const handleSearchBlur = (e) => {
    if (!e.relatedTarget?.closest('.search-suggestions')) {
      setIsSearchFocused(false);
      setShowSearchSuggestions(false);
    }
  };

  /**
   * Updates search query state and filters suggestions
   * @param {Event} event - Change event from search input
   */
  const handleSearch = (event) => {
    setSearchQuery(event.target.value);
  };

  /**
   * Handles user suggestion selection
   * @param {Object} user - Selected user object
   */
  const handleUserSuggestionClick = (user) => {
    onUserSelect(user);
    setSearchQuery('');
    setShowSearchSuggestions(false);
  };

  /**
   * Handles channel suggestion selection
   * @param {Object} channel - Selected channel object
   */
  const handleChannelSuggestionClick = (channel) => {
    onChannelSelect(channel);
    setSearchQuery('');
    setShowSearchSuggestions(false);
  };

  /**
   * Triggers global search with current query
   */
  const handleSearchClick = () => {
    onSearch(searchQuery);
    setShowSearchSuggestions(false);
  };

  return (
    <Box
      ref={searchBoxRef}
      sx={{
        flexGrow: 1,
        maxWidth: 600,
        mx: 'auto',
        position: 'relative',
        height: 28,
        display: 'flex',
        alignItems: 'center',
      }}
    >
      {/* Search Input */}
      <Box
        component="form"
        onSubmit={(e) => e.preventDefault()}
        sx={{
          width: '100%',
          height: '100%',
          backgroundColor: isSearchFocused ? 'common.white' : 'rgba(255, 255, 255, 0.27)',
          borderRadius: 1,
          display: 'flex',
          alignItems: 'center',
          px: 1.5,
          transition: 'background-color 0.2s ease',
        }}
      >
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center',
          width: '100%',
        }}>
          <SearchIcon 
            sx={{ 
              mr: 1, 
              fontSize: 18,
              color: isSearchFocused ? 'grey.500' : '#FFFFFF',
              transition: 'color 0.2s ease',
            }} 
          />
          <TextField
            value={searchQuery}
            onChange={handleSearch}
            onFocus={handleSearchFocus}
            onBlur={handleSearchBlur}
            placeholder="Search workspace..."
            variant="standard"
            fullWidth
            autoComplete="off"
            InputProps={{
              disableUnderline: true,
              sx: {
                fontSize: '0.875rem',
                color: isSearchFocused ? 'text.primary' : '#FFFFFF',
                '&::placeholder': {
                  color: isSearchFocused ? 'text.secondary' : '#FFFFFF',
                  opacity: 1,
                },
                '& input': {
                  padding: 0,
                  height: '28px',
                  '&::placeholder': {
                    color: isSearchFocused ? 'text.secondary' : '#FFFFFF',
                    opacity: 1,
                  },
                },
              },
            }}
          />
        </Box>
      </Box>

      {/* Search Suggestions Dropdown */}
      {showSearchSuggestions && searchQuery && (
        <Paper
          className="search-suggestions"
          elevation={8}
          sx={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            mt: 1,
            maxHeight: 400,
            overflow: 'auto',
            zIndex: (theme) => theme.zIndex.modal + 1,
          }}
        >
          {/* Global Search Section */}
          <Typography
            variant="overline"
            sx={{
              display: 'block',
              px: 2,
              py: 1,
              color: 'text.secondary',
              bgcolor: 'grey.50',
            }}
          >
            Search For
          </Typography>
          <MenuItem
            tabIndex={0}
            onClick={handleSearchClick}
            sx={{ py: 1, px: 2 }}
          >
            <SearchIcon sx={{ mr: 1, fontSize: 20, color: 'text.secondary' }} />
            <Typography>"{searchQuery}"</Typography>
          </MenuItem>

          {/* Channels Section */}
          {channelSuggestions.length > 0 && (
            <>
              <Typography
                variant="overline"
                sx={{
                  display: 'block',
                  px: 2,
                  py: 1,
                  color: 'text.secondary',
                  bgcolor: 'grey.50',
                }}
              >
                Channels
              </Typography>
              {channelSuggestions.map(channel => (
                <MenuItem
                  key={channel.id}
                  tabIndex={0}
                  onClick={() => handleChannelSuggestionClick(channel)}
                  sx={{ py: 1, px: 2 }}
                >
                  <TagIcon sx={{ mr: 1, fontSize: 20, color: 'text.secondary' }} />
                  <Typography>{channel.name}</Typography>
                </MenuItem>
              ))}
            </>
          )}

          {/* Users Section */}
          {userSuggestions.length > 0 && (
            <>
              <Typography
                variant="overline"
                sx={{
                  display: 'block',
                  px: 2,
                  py: 1,
                  color: 'text.secondary',
                  bgcolor: 'grey.50',
                }}
              >
                Users
              </Typography>
              {userSuggestions.map(user => (
                <MenuItem
                  key={user.id}
                  tabIndex={0}
                  onClick={() => handleUserSuggestionClick(user)}
                  sx={{ py: 1, px: 2 }}
                >
                  <Avatar 
                    sx={{ 
                      width: 24, 
                      height: 24, 
                      fontSize: '0.75rem',
                      mr: 1,
                      borderRadius: 1,
                      bgcolor: getAvatarColor(user.id),
                      fontWeight: 700
                    }}
                  >
                    {user.name.charAt(0).toUpperCase()}
                  </Avatar>
                  <Typography>{user.name}</Typography>
                </MenuItem>
              ))}
            </>
          )}
        </Paper>
      )}
    </Box>
  );
} 