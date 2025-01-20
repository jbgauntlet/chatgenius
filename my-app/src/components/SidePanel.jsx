/**
 * SidePanel Component
 * 
 * A sliding side panel component that can be used to display various types of content.
 * Features smooth animations, a header with title, and customizable content area.
 * 
 * Features:
 * - Smooth slide animation
 * - Customizable header with title
 * - Scrollable content area
 * - Close button
 * - Responsive design
 * 
 * @component
 * @param {Object} props
 * @param {boolean} props.open - Controls panel visibility
 * @param {Function} props.onClose - Callback when panel is closed
 * @param {string} props.type - Type of content being displayed
 * @param {string} props.title - Title displayed in panel header
 * @param {React.ReactNode} props.children - Content to be displayed in panel
 */

import React from 'react';
import {
  Box,
  Typography,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

export default function SidePanel({ 
  open, 
  onClose, 
  type, 
  title,
  children 
}) {
  return (
    <Box
      sx={{
        width: 400,
        bgcolor: 'background.paper',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s ease',
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        borderLeft: 1,
        borderColor: 'divider',
      }}
    >
      {/* Header Section */}
      <Box sx={{ 
        p: 2, 
        borderBottom: 1, 
        borderColor: 'divider',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <Typography variant="h6">
          {title}
        </Typography>
        <IconButton onClick={onClose} sx={{ color: 'grey.500' }}>
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Content Section */}
      <Box sx={{ 
        flexGrow: 1,
        overflow: 'auto',
        p: 3,
      }}>
        {children}
      </Box>
    </Box>
  );
} 