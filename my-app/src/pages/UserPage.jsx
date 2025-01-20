/**
 * @fileoverview Main user interface page component for the chat application.
 * This is the central component that manages the entire chat workspace interface,
 * including channels, direct messages, workspaces, and various interactive features.
 *
 * Key Features:
 * - Workspace management and switching
 * - Channel and direct message handling
 * - Real-time presence system
 * - File attachments and sharing
 * - Message threading
 * - AI assistant integration
 * - Search functionality
 * - User management and permissions
 * - Invite system
 */

import React, { useEffect, useState, useRef } from 'react';

/**
 * Material-UI Components
 * - Layout components (Box, AppBar, Drawer, etc.)
 * - Interactive components (Button, IconButton, etc.)
 * - Data display components (Typography, List, etc.)
 * - Feedback components (Modal, CircularProgress, etc.)
 * - Navigation components (Menu, Popper, etc.)
 */
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Button,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  ListItemIcon,
  Avatar,
  Divider,
  Collapse,
  Modal,
  TextField,
  Paper,
  Stack,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  Popper,
  Grow,
  ClickAwayListener,
  MenuList,
  ListItemAvatar,
} from '@mui/material';

/**
 * Material-UI Icons
 * Used for various UI elements and actions throughout the application
 */
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ArrowRightIcon from '@mui/icons-material/ArrowRight';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import TagIcon from '@mui/icons-material/Tag';
import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';
import SearchIcon from '@mui/icons-material/Search';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import LogoutIcon from '@mui/icons-material/Logout';
import CloseIcon from '@mui/icons-material/Close';
import NotificationsIcon from '@mui/icons-material/NotificationsOutlined';
import NotificationsFilledIcon from '@mui/icons-material/Notifications';
import HomeIcon from '@mui/icons-material/HomeOutlined';
import HomeFilledIcon from '@mui/icons-material/Home';
import ChatIcon from '@mui/icons-material/Chat';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import ChatBubbleIcon from '@mui/icons-material/ChatBubbleOutline';
import ChatBubbleFilledIcon from '@mui/icons-material/ChatBubble';
import SmartToyIcon from '@mui/icons-material/SmartToy';

/**
 * React Router
 * Handles navigation and routing within the application
 */
import { useNavigate } from 'react-router-dom';

/**
 * Database and Utilities
 * - supabase: Database client for real-time features and data management
 * - getAvatarColor: Utility for generating consistent avatar colors
 * - generateEmbedding: Utility for creating message embeddings for AI features
 */
import { supabase } from '../supabaseClient';
import { getAvatarColor } from '../utils/colors';
import { generateEmbedding } from '../utils/embeddings';

/**
 * Custom Components
 * Core functionality components for the chat interface
 */
import Messaging from '../components/Messaging';
import DirectMessaging from '../components/DirectMessaging';
import SidePanel from '../components/SidePanel';
import AiAssistantContent from '../components/AiAssistantContent';
import RepliesContent from '../components/RepliesContent';
import SearchResults from '../components/SearchResults';
import SearchBar from '../components/SearchBar';
import HeroSidebar from '../components/HeroSidebar';
import CreateWorkspaceModal from '../components/CreateWorkspaceModal';
import UserBotContent from '../components/UserBotContent';

/**
 * UserPage Component
 * Main interface component that serves as the primary workspace view after user login.
 * Manages the entire chat interface including workspaces, channels, and direct messages.
 */
function UserPage() {
  const navigate = useNavigate();

  /**
   * State Management
   * Core application state variables for managing the chat interface
   */

  // Channel and messaging states
  const [channels, setChannels] = useState([]); // List of available channels in current workspace
  const [selectedChannel, setSelectedChannel] = useState(null); // Currently selected channel
  const [selectedUser, setSelectedUser] = useState(null); // Selected user for direct messaging
  const [channelsOpen, setChannelsOpen] = useState(true); // Channels list expansion state
  const [dmsOpen, setDmsOpen] = useState(true); // Direct messages list expansion state

  // User and workspace member states
  const [users, setUsers] = useState([]); // List of users in current workspace
  const [currentUser, setCurrentUser] = useState(null); // Currently logged in user
  const [workspaceMembers, setWorkspaceMembers] = useState([]); // All members in current workspace
  const [currentUserRole, setCurrentUserRole] = useState(null); // User's role in current workspace

  // Workspace management states
  const [workspaces, setWorkspaces] = useState([]); // List of all accessible workspaces
  const [currentWorkspace, setCurrentWorkspace] = useState(null); // Currently selected workspace
  const [workspaceSwitcherAnchor, setWorkspaceSwitcherAnchor] = useState(null); // Anchor for workspace switcher menu
  const [workspaceMenuAnchor, setWorkspaceMenuAnchor] = useState(null); // Anchor for workspace settings menu
  const [userMenuAnchor, setUserMenuAnchor] = useState(null); // Anchor for user menu

  // Modal and UI states
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false); // Channel creation modal
  const [isCreateWorkspaceOpen, setIsCreateWorkspaceOpen] = useState(false); // Workspace creation modal
  const [isWorkspaceSettingsOpen, setIsWorkspaceSettingsOpen] = useState(false); // Workspace settings modal
  const [isInviteMembersOpen, setIsInviteMembersOpen] = useState(false); // Invite members modal
  const [isHelpOpen, setIsHelpOpen] = useState(false); // Help panel state

  // Form and input states
  const [newChannelName, setNewChannelName] = useState(''); // New channel name input
  const [newWorkspaceName, setNewWorkspaceName] = useState(''); // New workspace name input
  const [workspaceChanges, setWorkspaceChanges] = useState({ // Workspace settings form
    name: '',
    description: ''
  });

  // Workspace settings states
  const [isWorkspaceEdited, setIsWorkspaceEdited] = useState(false); // Track workspace setting changes
  const [isSaving, setIsSaving] = useState(false); // Saving state for workspace settings
  const [saveError, setSaveError] = useState(null); // Error state for workspace settings

  // Invite system states
  const [inviteLink, setInviteLink] = useState(''); // Generated invite link
  const [inviteCode, setInviteCode] = useState(''); // Generated invite code
  const [activeInvites, setActiveInvites] = useState([]); // List of active workspace invites

  // Side panel and UI feature states
  const [sidePanelState, setSidePanelState] = useState({
    type: null, // Type of content to show: 'help' | 'replies' | 'assistant' | 'user-bot' | null
    isOpen: false, // Panel visibility
    data: null // Data to pass to the panel content
  });

  // Search functionality states
  const [searchResults, setSearchResults] = useState([]); // Global search results
  const [isSearching, setIsSearching] = useState(false); // Search in progress indicator
  const [showSearchResults, setShowSearchResults] = useState(false); // Search results visibility
  const [currentSearchQuery, setCurrentSearchQuery] = useState(''); // Current search query

  /**
   * AI Assistant Query Handler
   * Processes user queries using RAG (Retrieval Augmented Generation) approach:
   * 1. Generates embeddings for the query
   * 2. Performs similarity search against stored message vectors
   * 3. Uses retrieved context with OpenAI to generate responses
   * 
   * @param {string} userQuery - The user's question or request
   * @param {string} workspaceId - Current workspace ID for context
   * @returns {Promise<string>} AI-generated response based on workspace context
   */
  async function queryAiAssistant(userQuery, workspaceId) {
    if (!workspaceId) {
      throw new Error('No workspace selected');
    }

    if (!currentUser) {
      throw new Error('No user found');
    }

    // Generate query embedding for similarity search
    const queryEmbedding = await generateEmbedding(userQuery);

    // Perform similarity search against stored message vectors
    const { data, error } = await supabase
      .rpc('vector_search', {
        query_vector: queryEmbedding,
        top_k: 5, // Retrieve top 5 most similar messages
        workspace_id: workspaceId,
        user_id: currentUser.id
      });

    console.log("Vector search results:", {
      data,
      error,
      workspaceId,
      queryLength: queryEmbedding.length
    });

    if (error) {
      console.error("Error retrieving vectors:", error);
      throw new Error('Error searching messages');
    }

    // Extract relevant messages for context
    const relevantMessages = data.map((item) => item.content);
    const context = relevantMessages.join("\n");
    
    // System prompt for AI assistant
    const systemPrompt = "You are a helpful AI assistant in a chat application. Use the provided message history as context to answer the user's question. If the context doesn't help answer the question, just say so.";
    
    try {
      // Send context and query to OpenAI for response generation
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Context from previous messages:\n${context}\n\n Use this context before anything else to solve the user question. Do not mention that you are using context in your response. User question: ${userQuery}` }
          ],
          max_tokens: 500,
          temperature: 0.7,
        }),
      });

      const result = await response.json();
      if (!result.choices?.[0]?.message?.content) {
        throw new Error('Invalid response from OpenAI');
      }
      return result.choices[0].message.content;
    } catch (error) {
      console.error("Error getting AI response:", error);
      throw new Error('Error generating response');
    }
  }

  /**
   * Core Application Effects
   * Setup real-time subscriptions, user presence, and initial data loading
   */
  useEffect(() => {
    fetchUserData();
    fetchWorkspaces();
    fetchChannels();
    fetchUsers();

    /**
     * Real-time User Presence System
     * Handles user online/offline status and presence updates
     */
    const presenceChannel = supabase
      .channel('user_presence_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_presence'
      }, async (payload) => {
        console.log('Presence change received:', payload);
        // Update users list with new presence data
        setUsers(prevUsers => {
          console.log('Previous users:', prevUsers);
          const updatedUsers = prevUsers.map(user => {
            if (user.id === payload.new.user_id) {
              console.log('Updating user presence for:', user.name);
              return {
                ...user,
                user_presence: {
                  status: payload.new.status,
                  status_message: payload.new.status_message,
                  last_seen: payload.new.last_seen
                }
              };
            }
            return user;
          });
          console.log('Updated users:', updatedUsers);
          return updatedUsers;
        });

        // Update currentUser presence if change is for them
        const { data: { user } } = await supabase.auth.getUser();
        if (user && user.id === payload.new.user_id) {
          setCurrentUser(prevUser => ({
            ...prevUser,
            user_presence: {
              status: payload.new.status,
              status_message: payload.new.status_message,
              last_seen: payload.new.last_seen
            }
          }));
        }
      })
      .subscribe();

    /**
     * Periodic Presence Updates
     * Updates user's active status every 30 seconds
     */
    const updatePresence = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      console.log('Updating presence for user:', user.id);
      const { data, error } = await supabase.rpc('update_user_presence', {
        user_id_param: user.id,
        status_param: 'active'
      });
      
      if (error) {
        console.error('Error updating presence:', error);
      } else {
        console.log('Presence updated successfully');
      }
    };

    // Initialize presence system
    updatePresence();
    const presenceInterval = setInterval(updatePresence, 30000);

    /**
     * Visibility Change Handler
     * Updates user status based on tab visibility
     */
    const handleVisibilityChange = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (document.hidden) {
        console.log('Tab hidden, setting status to away');
        supabase.rpc('update_user_presence', {
          user_id_param: user.id,
          status_param: 'away'
        });
      } else {
        console.log('Tab visible, setting status to active');
        supabase.rpc('update_user_presence', {
          user_id_param: user.id,
          status_param: 'active'
        });
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup function
    return () => {
      supabase.removeChannel(presenceChannel);
      clearInterval(presenceInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      // Set status to away when component unmounts
      const handleUnmount = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          console.log('Component unmounting, setting status to away');
          await supabase.rpc('update_user_presence', {
            user_id_param: user.id,
            status_param: 'away'
          });
        }
      };
      handleUnmount();
    };
  }, []);

  /**
   * Data Fetching Effects
   * Handle dependencies between workspace, channels, and user data
   */

  // Fetch user role when workspace changes
  useEffect(() => {
    if (currentWorkspace && currentUser) {
      fetchUserWorkspaceRole();
    }
  }, [currentWorkspace, currentUser]);

  // Fetch workspace members when workspace changes
  useEffect(() => {
    if (currentWorkspace) {
      fetchWorkspaceMembers();
    }
  }, [currentWorkspace]);

  // Fetch channels when workspace changes
  useEffect(() => {
    if (currentWorkspace) {
      fetchChannels();
      setSelectedChannel(null); // Clear selected channel when switching workspaces
    } else {
      setChannels([]); // Clear channels if no workspace is selected
    }
  }, [currentWorkspace]);

  // Fetch users when workspace changes
  useEffect(() => {
    if (currentWorkspace) {
      fetchUsers();
    } else {
      setUsers([]); // Clear users if no workspace is selected
    }
  }, [currentWorkspace]);

  /**
   * Data Fetching Functions
   * Core functions for retrieving application data from Supabase
   */

  /**
   * Fetches current user data including presence information
   * Updates currentUser state with user details and presence status
   */
  const fetchUserData = async () => {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('Error fetching auth user:', authError);
      return;
    }

    if (user) {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select(`
          *,
          user_presence (
            status,
            status_message,
            last_seen
          )
        `)
        .eq('id', user.id)
        .single();

      if (userError) {
        console.error('Error fetching user data:', userError);
      } else {
        setCurrentUser(userData);
      }
    }
  };

  /**
   * Fetches channels for the current workspace
   * Updates channels state and selects first channel by default
   */
  const fetchChannels = async () => {
    if (!currentWorkspace) return; // Don't fetch if no workspace is selected

    const { data, error } = await supabase
      .from('channels')
      .select('id, name')
      .eq('workspace_id', currentWorkspace.id);

    if (error) {
      console.error('Error fetching channels:', error);
    } else {
      setChannels(data);
      if (data.length > 0) {
        setSelectedChannel(data[0]);
      }
    }
  };

  /**
   * Fetches users in the current workspace with their presence data
   * Excludes the current user from the results
   */
  const fetchUsers = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !currentWorkspace) return;

    console.log('Fetching users with presence data for workspace:', currentWorkspace.id);
    const { data, error } = await supabase
      .from('workspace_memberships')
      .select(`
        users!inner (
          id,
          name,
          user_presence!inner (
            status,
            status_message,
            last_seen
          )
        )
      `)
      .eq('workspace_id', currentWorkspace.id)
      .neq('user_id', user.id); // Don't include the current user

    if (error) {
      console.error('Error fetching users:', error);
    } else {
      console.log('Fetched workspace users with presence:', data);
      // Transform the data structure to match the existing format
      const transformedUsers = data.map(item => ({
        ...item.users,
        user_presence: item.users.user_presence[0]
      }));
      setUsers(transformedUsers);
    }
  };

  /**
   * Fetches all workspaces the user has access to
   * Handles workspace selection persistence using localStorage
   */
  const fetchWorkspaces = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('workspace_memberships')
      .select(`
        workspace:workspaces (
          id,
          name,
          owner_id
        )
      `)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching workspaces:', error);
    } else {
      const workspaceList = data.map(item => item.workspace);
      setWorkspaces(workspaceList);
      
      // Check localStorage for saved workspace after fetching
      const savedWorkspaceId = localStorage.getItem('currentWorkspaceId');
      if (savedWorkspaceId) {
        const savedWorkspace = workspaceList.find(w => w.id === savedWorkspaceId);
        if (savedWorkspace) {
          setCurrentWorkspace(savedWorkspace);
        }
      } else if (workspaceList.length > 0) {
        // If no saved workspace but we have workspaces, set the first one
        setCurrentWorkspace(workspaceList[0]);
      }
    }
  };

  /**
   * Fetches the user's role in the current workspace
   * Updates currentUserRole state for permission management
   */
  const fetchUserWorkspaceRole = async () => {
    if (!currentWorkspace || !currentUser) return;

    const { data, error } = await supabase
      .from('workspace_memberships')
      .select('role')
      .eq('workspace_id', currentWorkspace.id)
      .eq('user_id', currentUser.id)
      .single();

    if (error) {
      console.error('Error fetching user role:', error);
    } else {
      setCurrentUserRole(data.role);
    }
  };

  /**
   * Fetches all members of the current workspace with their roles
   * Updates workspaceMembers state for member management
   */
  const fetchWorkspaceMembers = async () => {
    if (!currentWorkspace) return;

    const { data, error } = await supabase
      .from('workspace_memberships')
      .select(`
        role,
        users (
          id,
          name
        )
      `)
      .eq('workspace_id', currentWorkspace.id);

    if (error) {
      console.error('Error fetching workspace members:', error);
    } else {
      console.log('Workspace members:', data);
      setWorkspaceMembers(data);
    }
  };

  /**
   * Authentication and Navigation Handlers
   */

  /**
   * Handles user logout
   * Signs out the user and redirects to home page
   */
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  /**
   * UI Interaction Handlers
   * Functions for managing UI state and user interactions
   */

  /**
   * Toggles the channels list expansion state
   */
  const handleChannelsClick = () => {
    setChannelsOpen(!channelsOpen);
  };

  /**
   * Toggles the direct messages list expansion state
   */
  const handleDMsClick = () => {
    setDmsOpen(!dmsOpen);
  };

  /**
   * Handles user selection for direct messaging
   * @param {Object} user - The selected user object
   */
  const handleUserSelect = (user) => {
    setSelectedUser(user);
    setSelectedChannel(null); // Deselect channel when selecting a DM
    // Only close side panel if it's not the AI assistant
    if (sidePanelState.type !== 'assistant') {
      setSidePanelState({
        type: null,
        isOpen: false,
        data: null
      });
    }
  };

  /**
   * Handles channel selection
   * @param {Object} channel - The selected channel object
   */
  const handleChannelSelect = (channel) => {
    setSelectedChannel(channel);
    setSelectedUser(null); // Deselect DM when selecting a channel
    // Only close side panel if it's not the AI assistant
    if (sidePanelState.type !== 'assistant') {
      setSidePanelState({
        type: null,
        isOpen: false,
        data: null
      });
    }
  };

  /**
   * Channel Management Functions
   */

  /**
   * Creates a new channel in the current workspace
   * Updates channels list and selects the new channel
   */
  const handleCreateChannel = async () => {
    if (!newChannelName.trim() || !currentWorkspace) return;

    const { data, error } = await supabase
      .from('channels')
      .insert([{ 
        name: newChannelName.trim(),
        workspace_id: currentWorkspace.id
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating channel:', error);
    } else {
      setNewChannelName('');
      setIsCreateChannelOpen(false);
      // Set the newly created channel as selected
      setSelectedChannel(data);
      // Update the channels list
      setChannels(prev => [...prev, data]);
    }
  };

  /**
   * Workspace Management Functions
   */

  /**
   * Handles workspace creation completion
   * Updates workspaces list and sets new workspace as current
   * @param {Object} workspace - The newly created workspace object
   */
  const handleCreateWorkspace = async (workspace) => {
    setIsCreateWorkspaceOpen(false);
    // Update the workspaces list and set the new workspace as current
    setWorkspaces(prev => [...prev, workspace]);
    setCurrentWorkspace(workspace);
  };

  /**
   * Workspace Switcher Menu Handlers
   */

  /**
   * Toggles the workspace switcher menu
   * @param {Event} event - The click event
   */
  const handleWorkspaceSwitcherClick = (event) => {
    setWorkspaceSwitcherAnchor(workspaceSwitcherAnchor ? null : event.currentTarget);
  };

  /**
   * Closes the workspace switcher menu
   */
  const handleWorkspaceSwitcherClose = () => {
    setWorkspaceSwitcherAnchor(null);
  };

  /**
   * Handles workspace selection from the switcher menu
   * Updates current workspace and persists selection
   * @param {Object} workspace - The selected workspace object
   */
  const handleWorkspaceSelect = (workspace) => {
    setCurrentWorkspace(workspace);
    localStorage.setItem('currentWorkspaceId', workspace.id);
    handleWorkspaceSwitcherClose();
  };

  /**
   * Side Panel Management
   */

  /**
   * Closes the side panel
   * Resets panel state and content
   */
  const handleSidePanelClose = () => {
    setSidePanelState({
      type: null,
      isOpen: false,
      data: null
    });
  };

  /**
   * Opens the AI assistant in the side panel
   */
  const handleHelpClick = () => {
    setSidePanelState({
      type: 'assistant',
      isOpen: true,
      data: null
    });
  };

  /**
   * Workspace Settings Menu Handlers
   */

  /**
   * Opens the workspace settings menu
   * @param {Event} event - The click event
   */
  const handleWorkspaceMenuClick = (event) => {
    setWorkspaceMenuAnchor(event.currentTarget);
  };

  /**
   * Closes the workspace settings menu
   */
  const handleWorkspaceMenuClose = () => {
    setWorkspaceMenuAnchor(null);
  };

  /**
   * Workspace Settings Management
   */

  /**
   * Opens the workspace settings modal
   * Initializes form with current workspace data
   */
  const handleWorkspaceSettingsOpen = () => {
    setWorkspaceChanges({
      name: currentWorkspace?.name || '',
      description: currentWorkspace?.description || ''
    });
    setIsWorkspaceSettingsOpen(true);
    handleWorkspaceMenuClose();
  };

  /**
   * Closes the workspace settings modal
   * Resets form state and errors
   */
  const handleWorkspaceSettingsClose = () => {
    setIsWorkspaceSettingsOpen(false);
    setIsWorkspaceEdited(false);
    setSaveError(null);
  };

  /**
   * Handles changes to workspace settings form fields
   * @param {string} field - The field being changed (name or description)
   * @returns {Function} Event handler for the field change
   */
  const handleWorkspaceChange = (field) => (e) => {
    const newValue = e.target.value;
    setWorkspaceChanges(prev => ({
      ...prev,
      [field]: newValue
    }));
    setIsWorkspaceEdited(true);
  };

  /**
   * Saves workspace setting changes
   * Updates workspace data in database and local state
   */
  const handleSaveWorkspaceChanges = async () => {
    setIsSaving(true);
    setSaveError(null);

    try {
      const { data, error } = await supabase
        .from('workspaces')
        .update({
          name: workspaceChanges.name,
          description: workspaceChanges.description
        })
        .eq('id', currentWorkspace.id)
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setCurrentWorkspace(data);
      setWorkspaces(prev => 
        prev.map(w => w.id === data.id ? data : w)
      );
      setIsWorkspaceEdited(false);
      handleWorkspaceSettingsClose();
    } catch (error) {
      console.error('Error updating workspace:', error);
      setSaveError('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Member Management Functions
   */

  /**
   * Handles removing a member from the workspace
   * Only available to workspace owners
   * @param {string} memberId - ID of the member to remove
   */
  const handleRemoveMember = async (memberId) => {
    if (!currentWorkspace || currentUserRole !== 'owner') return;

    try {
      const { error } = await supabase
        .from('workspace_memberships')
        .delete()
        .eq('workspace_id', currentWorkspace.id)
        .eq('user_id', memberId);

      if (error) throw error;

      // Update the local state to remove the member
      setWorkspaceMembers(prev => 
        prev.filter(member => member.users.id !== memberId)
      );
    } catch (error) {
      console.error('Error removing member:', error);
    }
  };

  /**
   * Invite System Functions
   */

  /**
   * Generates a new invite link for the workspace
   * Creates an invite record and generates a shareable URL
   */
  const handleGenerateInviteLink = async () => {
    if (!currentWorkspace) return;

    try {
      const { data, error } = await supabase
        .from('workspace_invites')
        .insert([{ 
          workspace_id: currentWorkspace.id,
          created_by: currentUser.id,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        }])
        .select()
        .single();

      if (error) throw error;

      // Create the invite link using the invite ID and environment variable
      const inviteUrl = `${import.meta.env.VITE_HOST}/invite/${data.id}`;
      setInviteLink(inviteUrl);
      
      // Refresh the active invites list
      fetchActiveInvites();
    } catch (error) {
      console.error('Error generating invite link:', error);
    }
  };

  /**
   * Generates a new invite code for the workspace
   * Creates an invite record and returns the ID as a code
   */
  const handleGenerateInviteCode = async () => {
    if (!currentWorkspace) return;

    try {
      const { data, error } = await supabase
        .from('workspace_invites')
        .insert([{ 
          workspace_id: currentWorkspace.id,
          created_by: currentUser.id,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        }])
        .select()
        .single();

      if (error) throw error;

      setInviteCode(data.id);
      
      // Refresh the active invites list
      fetchActiveInvites();
    } catch (error) {
      console.error('Error generating invite code:', error);
    }
  };

  /**
   * Fetches active (non-expired, non-used) invites for the workspace
   * Updates activeInvites state with invite data
   */
  const fetchActiveInvites = async () => {
    if (!currentWorkspace) return;

    const { data, error } = await supabase
      .from('workspace_invites')
      .select(`
        id,
        created_at,
        expires_at,
        users:created_by (
          name
        )
      `)
      .eq('workspace_id', currentWorkspace.id)
      .eq('active', true)
      .is('used_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching invites:', error);
    } else {
      setActiveInvites(data);
    }
  };

  /**
   * Revokes (deactivates) an invite
   * @param {string} inviteId - ID of the invite to revoke
   */
  const handleRevokeInvite = async (inviteId) => {
    try {
      const { error } = await supabase
        .from('workspace_invites')
        .update({ active: false })
        .eq('id', inviteId);

      if (error) throw error;

      // Update local state to remove the revoked invite
      setActiveInvites(prev => prev.filter(invite => invite.id !== inviteId));
    } catch (error) {
      console.error('Error revoking invite:', error);
    }
  };

  // Fetch active invites when the invite modal opens
  useEffect(() => {
    if (isInviteMembersOpen) {
      fetchActiveInvites();
    }
  }, [isInviteMembersOpen]);

  /**
   * Message Threading Functions
   */

  /**
   * Handles opening the thread panel for a message
   * @param {Object} message - The parent message to show replies for
   */
  const handleThreadClick = (message) => {
    setSidePanelState({
      type: 'replies',
      isOpen: true,
      data: message
    });
  };

  /**
   * Search Functionality
   */

  /**
   * Performs a global search across messages and direct messages
   * Updates search results and UI state
   * @param {string} query - The search query
   */
  const handleGlobalSearch = async (query) => {
    setShowSearchResults(true);
    setIsSearching(true);
    setCurrentSearchQuery(query);

    try {
      // Search in both messages and user_messages tables
      const [messagesResult, dmResult] = await Promise.all([
        supabase
          .from('messages')
          .select(`
            *,
            sender:sender_id (
              name
            ),
            channel:channel_id (
              name
            )
          `)
          .eq('workspace_id', currentWorkspace.id)
          .ilike('content', `%${query}%`),
        
        supabase
          .from('user_messages')
          .select(`
            *,
            sender:sender_id (
              name
            ),
            recipient:recipient_id (
              name
            )
          `)
          .eq('workspace_id', currentWorkspace.id)
          .ilike('content', `%${query}%`)
      ]);

      if (messagesResult.error) throw messagesResult.error;
      if (dmResult.error) throw dmResult.error;

      // Combine and sort results by date
      const allResults = [...messagesResult.data, ...dmResult.data]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      setSearchResults(allResults);
    } catch (error) {
      console.error('Error searching messages:', error);
    } finally {
      setIsSearching(false);
    }
  };

  /**
   * Handles clicking on a search result
   * Navigates to the appropriate channel/DM and opens thread if needed
   * @param {Object} message - The message that was clicked
   */
  const handleSearchResultClick = async (message) => {
    const isDirectMessage = !message.channel_id;
    const isThreadReply = Boolean(message.parent_message_id);

    if (isDirectMessage) {
      // For DMs, set the recipient as selected user
      const recipient = message.sender_id === currentUser?.id ? 
        { id: message.recipient_id, name: message.recipient.name } :
        { id: message.sender_id, name: message.sender.name };
      setSelectedUser(recipient);
      setSelectedChannel(null);
    } else {
      // For channel messages, set the channel
      setSelectedChannel({ id: message.channel_id, name: message.channel.name });
      setSelectedUser(null);
    }

    // If it's a thread reply, open the thread panel
    if (isThreadReply) {
      // Fetch the parent message first
      const { data: parentMessage } = await supabase
        .from(isDirectMessage ? 'user_messages' : 'messages')
        .select(`
          *,
          sender:sender_id (
            name
          ),
          ${isDirectMessage ? `
            recipient:recipient_id (
              name
            )
          ` : `
            channel:channel_id (
              name
            )
          `}
        `)
        .eq('id', message.parent_message_id)
        .single();

      if (parentMessage) {
        setSidePanelState({
          type: 'replies',
          isOpen: true,
          data: parentMessage
        });
      }
    }

    // Clear search results
    setShowSearchResults(false);
  };

  /**
   * User Bot Functions
   */

  /**
   * Opens the user bot panel for a specific user
   * @param {Object} user - The user to open the bot for
   */
  const handleUserBotClick = (user) => {
    setSidePanelState({
      type: 'user-bot',
      isOpen: true,
      data: user
    });
  };

  /**
   * Component Render
   * Main application layout structure:
   * - Top bar with search and help
   * - Hero sidebar for workspace navigation
   * - Channel sidebar for workspace content navigation
   * - Main content area for messages
   * - Side panel for threads, AI assistant, etc.
   */
  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh', 
      width: '100%', 
      overflow: 'hidden',
      background: 'linear-gradient(to bottom right, #461147, #39083B)',
    }}>
      {/* Global Top Bar */}
      <AppBar 
        position="static" 
        elevation={0}
        sx={{ 
          backgroundColor: 'transparent',
          height: '40px',
          minHeight: '40px',
          '& .MuiToolbar-root': {
            minHeight: '40px',
            height: '40px',
            padding: '0 16px',
          },
        }}
      >
        <Toolbar 
          sx={{ 
            justifyContent: 'space-between', 
            gap: 2,
          }}
        >
          {/* Left section - reserved for future use */}
          <Box sx={{ width: 240, visibility: 'hidden' }} />

          {/* Center section - Global Search */}
          <SearchBar
            users={users}
            channels={channels}
            onUserSelect={(user) => {
              handleUserSelect(user);
              setShowSearchResults(false);
            }}
            onChannelSelect={(channel) => {
              handleChannelSelect(channel);
              setShowSearchResults(false);
            }}
            onSearch={handleGlobalSearch}
          />

          {/* Right section - Help Button */}
          <Box sx={{ display: 'flex', alignItems: 'center', ml: 'auto' }}>
            <IconButton
              onClick={handleHelpClick}
              disableRipple
              size="small"
              sx={{ 
                color: '#FFFFFF',
                '&:focus': {
                  outline: 'none',
                },
                p: 0.75,
              }}
            >
              <HelpOutlineIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Main Content Container */}
      <Box sx={{ 
        display: 'flex', 
        flexGrow: 1, 
        minHeight: 0,
      }}>
        {/* Hero Sidebar - Workspace Navigation */}
        <HeroSidebar
          currentUser={currentUser}
          workspaces={workspaces}
          currentWorkspace={currentWorkspace}
          onCreateWorkspace={() => setIsCreateWorkspaceOpen(true)}
          onWorkspaceSelect={handleWorkspaceSelect}
          onLogout={handleLogout}
        />

        {/* Main Application Area */}
        <Box sx={{ 
          display: 'flex',
          flexGrow: 1,
          bgcolor: 'rgba(0, 0, 0, 0.2)',
          borderRadius: 2,
          overflow: 'hidden',
          mr: '4px',
          mb: '5px',
        }}>
          {/* Channel and DM Sidebar */}
          <Drawer
            variant="permanent"
            sx={{
              width: 280,
              flexShrink: 0,
              height: '100%',
              '& .MuiDrawer-paper': { 
                position: 'relative',
                width: 280, 
                boxSizing: 'border-box',
                bgcolor: 'rgba(255, 255, 255, 0.17)',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                '& .MuiListItemText-primary': {
                  color: 'rgb(249, 237, 255)',
                  fontSize: '15px',
                },
                '& .MuiListItemText-secondary': {
                  color: 'rgba(249, 237, 255, 0.7)',
                },
                '& .MuiSvgIcon-root': {
                  color: 'rgb(249, 237, 255)',
                },
                '& .MuiDivider-root': {
                  borderColor: 'rgba(249, 237, 255, 0.2)',
                },
              },
            }}
          >
            {/* Workspace Header and Navigation */}
            <Box sx={{ 
              flexGrow: 1, 
              overflow: 'auto',
              display: 'flex',
              flexDirection: 'column',
            }}>
              {/* Workspace Selector */}
              <List>
                <ListItemButton 
                  onClick={handleWorkspaceMenuClick}
                  sx={{
                    display: 'flex',
                    justifyContent: 'flex-start',
                  }}
                >
                  <ListItemText 
                    primary={currentWorkspace?.name || 'Select a workspace'} 
                    sx={{ 
                      ml: 2,
                      flex: '0 1 auto',
                      '& .MuiListItemText-primary': {
                        fontSize: '16px',
                        fontWeight: 900,
                      },
                    }}
                  />
                  <KeyboardArrowDownIcon 
                    sx={{ 
                      ml: '2px',
                      color: 'rgb(249, 237, 255)',
                      fontSize: 20,
                      flex: '0 0 auto',
                    }} 
                  />
                </ListItemButton>

                {/* Channel and DM Items */}
                {channels.map((channel) => (
                  <ListItemButton 
                    key={channel.id}
                    onClick={() => handleChannelSelect(channel)}
                  >
                    <ListItemText 
                      primary={channel.name}
                      secondary={`${channel.messages.length} messages`}
                    />
                  </ListItemButton>
                ))}

                {/* Direct Messages */}
                {dmsOpen && (
                  <ListItemButton 
                    onClick={handleDMsClick}
                  >
                    <ListItemText 
                      primary="Direct Messages"
                      secondary={`${selectedUser ? selectedUser.name : 'No messages'}`}
                    />
                  </ListItemButton>
                )}
              </List>
            </Box>
          </Drawer>

          {/* Main Content Area */}
          <Box sx={{ 
            flexGrow: 1,
            p: 2,
            overflow: 'auto',
          }}>
            {/* Messages and Threads */}
            {selectedChannel ? (
              <Messaging
                channel={selectedChannel}
                currentUser={currentUser}
                workspaceMembers={workspaceMembers}
                onThreadClick={handleThreadClick}
              />
            ) : (
              <DirectMessaging
                currentUser={currentUser}
                selectedUser={selectedUser}
                workspaceMembers={workspaceMembers}
                onThreadClick={handleThreadClick}
              />
            )}
          </Box>

          {/* Side Panel */}
          <SidePanel
            state={sidePanelState}
            onClose={handleSidePanelClose}
          />
        </Box>
      </Box>

      {/* Modals */}
      
      {/* Create Channel Modal */}
      <Modal
        open={isCreateChannelOpen}
        onClose={() => setIsCreateChannelOpen(false)}
        aria-labelledby="create-channel-modal"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        }}
      >
        <Paper sx={{ p: 4, maxWidth: 400, width: '90%' }}>
          <Typography variant="h6" component="h2" gutterBottom>
            Create a new channel
          </Typography>
          <Stack spacing={3}>
            <TextField
              autoFocus
              fullWidth
              placeholder="Enter channel name"
              value={newChannelName}
              onChange={(e) => setNewChannelName(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleCreateChannel();
                }
              }}
            />
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button 
                variant="outlined" 
                onClick={() => {
                  setIsCreateChannelOpen(false);
                  setNewChannelName('');
                }}
              >
                Cancel
              </Button>
              <Button 
                variant="contained" 
                onClick={handleCreateChannel}
                disabled={!newChannelName.trim()}
              >
                Create Channel
              </Button>
            </Box>
          </Stack>
        </Paper>
      </Modal>

      {/* Create Workspace Modal */}
      <CreateWorkspaceModal
        open={isCreateWorkspaceOpen}
        onClose={() => setIsCreateWorkspaceOpen(false)}
        onWorkspaceCreated={handleCreateWorkspace}
      />

      {/* Workspace Settings Modal */}
      <Modal
        open={isWorkspaceSettingsOpen}
        onClose={handleWorkspaceSettingsClose}
        aria-labelledby="workspace-settings-modal"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Paper
          sx={{
            width: 500,
            maxWidth: '90%',
            maxHeight: '90vh',
            overflow: 'auto',
            p: 3,
          }}
        >
          {/* Settings Header */}
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              Workspace Settings
            </Typography>
            <IconButton onClick={handleWorkspaceSettingsClose} sx={{ color: 'grey.500' }}>
              <CloseIcon />
            </IconButton>
          </Box>

          <Stack spacing={3}>
            {/* General Settings Section */}
            <Box>
              <Typography
                variant="subtitle2"
                sx={{
                  color: 'grey.700',
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  mb: 2,
                }}
              >
                General Settings
              </Typography>

              <Stack spacing={3}>
                {/* Workspace Name Field */}
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Workspace Name
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    value={workspaceChanges.name}
                    onChange={handleWorkspaceChange('name')}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'grey.100',
                      },
                    }}
                  />
                </Box>

                {/* Workspace Description Field */}
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Description
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    multiline
                    rows={3}
                    placeholder="Add a description for your workspace"
                    value={workspaceChanges.description}
                    onChange={handleWorkspaceChange('description')}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'grey.100',
                      },
                    }}
                  />
                  <Typography
                    variant="caption"
                    sx={{ mt: 0.5, display: 'block', color: 'grey.600' }}
                  >
                    Let people know what this workspace is about.
                  </Typography>
                </Box>
              </Stack>
            </Box>

            <Divider />

            {/* Members Section */}
            <Box>
              <Typography
                variant="subtitle2"
                sx={{
                  color: 'grey.700',
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  mb: 2,
                }}
              >
                Members
              </Typography>

              <Stack spacing={2}>
                {/* Members List */}
                <List 
                  sx={{ 
                    bgcolor: 'grey.100', 
                    borderRadius: 1,
                    maxHeight: 300,
                    overflow: 'auto',
                  }}
                >
                  {workspaceMembers.map((member) => (
                    <ListItem
                      key={member.users.id}
                      secondaryAction={
                        currentUserRole === 'owner' && member.users.id !== currentUser?.id && (
                          <IconButton 
                            edge="end" 
                            size="small"
                            onClick={() => handleRemoveMember(member.users.id)}
                          >
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        )
                      }
                      sx={{
                        py: 0,
                      }}
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ 
                          bgcolor: getAvatarColor(member.users.id),
                          borderRadius: 1.5,
                          fontWeight: 700
                        }}>
                          {member.users.name.charAt(0).toUpperCase()}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={member.users.name}
                        secondary={member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                      />
                    </ListItem>
                  ))}
                </List>

                {/* Invite Members Button */}
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  sx={{ alignSelf: 'flex-start' }}
                  onClick={() => setIsInviteMembersOpen(true)}
                >
                  Invite Members
                </Button>
              </Stack>
            </Box>

            <Divider />

            {/* Save Button and Error Message */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1, mt: 2 }}>
              {saveError && (
                <Typography color="error" variant="caption">
                  {saveError}
                </Typography>
              )}
              <Button
                variant="contained"
                onClick={handleSaveWorkspaceChanges}
                disabled={!isWorkspaceEdited || isSaving}
                sx={{ minWidth: 100 }}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </Box>
          </Stack>
        </Paper>
      </Modal>

      {/* Invite Members Modal */}
      <Modal
        open={isInviteMembersOpen}
        onClose={() => setIsInviteMembersOpen(false)}
        aria-labelledby="invite-members-modal"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Paper
          sx={{
            width: 500,
            maxWidth: '90%',
            maxHeight: '90vh',
            overflow: 'auto',
            p: 3,
          }}
        >
          {/* Invite Modal Header */}
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              Invite Members
            </Typography>
            <IconButton onClick={() => setIsInviteMembersOpen(false)} sx={{ color: 'grey.500' }}>
              <CloseIcon />
            </IconButton>
          </Box>

          <Stack spacing={3}>
            {/* Invite Generation Section */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 2 }}>
                Generate an invite link or code to share with others
              </Typography>
              
              <Stack spacing={2}>
                {/* Generate Invite Buttons */}
                <Box sx={{ display: 'flex', gap: 2 }}>
                  {!inviteLink && (
                    <Button
                      variant="contained"
                      onClick={handleGenerateInviteLink}
                      startIcon={<AddIcon />}
                      sx={{ whiteSpace: 'nowrap' }}
                    >
                      Generate Invite Link
                    </Button>
                  )}
                  {!inviteCode && (
                    <Button
                      variant="contained"
                      onClick={handleGenerateInviteCode}
                      startIcon={<AddIcon />}
                      sx={{ whiteSpace: 'nowrap' }}
                    >
                      Generate Invite Code
                    </Button>
                  )}
                </Box>

                <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                  Invites automatically expire after use
                </Typography>

                {/* Invite Link Display */}
                {inviteLink && (
                  <Box sx={{ 
                    display: 'flex', 
                    gap: 1,
                    alignItems: 'center',
                    bgcolor: 'grey.100',
                    p: 2,
                    borderRadius: 1,
                  }}>
                    <TextField
                      fullWidth
                      size="small"
                      value={inviteLink}
                      InputProps={{
                        readOnly: true,
                      }}
                    />
                    <Button
                      variant="contained"
                      onClick={() => {
                        navigator.clipboard.writeText(inviteLink);
                      }}
                    >
                      Copy
                    </Button>
                  </Box>
                )}

                {/* Invite Code Display */}
                {inviteCode && (
                  <Box sx={{ 
                    display: 'flex', 
                    gap: 1,
                    alignItems: 'center',
                    bgcolor: 'grey.100',
                    p: 2,
                    borderRadius: 1,
                  }}>
                    <TextField
                      fullWidth
                      size="small"
                      value={inviteCode}
                      InputProps={{
                        readOnly: true,
                      }}
                    />
                    <Button
                      variant="contained"
                      onClick={() => {
                        navigator.clipboard.writeText(inviteCode);
                      }}
                    >
                      Copy
                    </Button>
                  </Box>
                )}
              </Stack>
            </Box>

            <Divider />

            {/* Active Invites Section */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 2 }}>
                Active Invites
              </Typography>
              {activeInvites.length > 0 ? (
                <List sx={{ bgcolor: 'grey.100', borderRadius: 1 }}>
                  {activeInvites.map((invite) => (
                    <ListItem
                      key={invite.id}
                      secondaryAction={
                        <IconButton 
                          edge="end" 
                          size="small"
                          onClick={() => handleRevokeInvite(invite.id)}
                          sx={{ color: 'error.main' }}
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      }
                    >
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2">
                              Created by {invite.users.name}
                            </Typography>
                          </Box>
                        }
                        secondary={
                          <Typography variant="caption" color="text.secondary">
                            Expires {new Date(invite.expires_at).toLocaleDateString()}
                          </Typography>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography color="text.secondary" variant="body2">
                  No active invites
                </Typography>
              )}
            </Box>
          </Stack>
        </Paper>
      </Modal>
    </Box>
  );
}

export default UserPage;
