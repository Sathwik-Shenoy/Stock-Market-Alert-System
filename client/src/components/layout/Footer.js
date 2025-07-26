import React from 'react';
import { Box, Container, Typography, Link, Grid, IconButton } from '@mui/material';
import { GitHub, LinkedIn, Twitter, Email } from '@mui/icons-material';

const Footer = () => {
  return (
    <Box
      component="footer"
      sx={{
        bgcolor: 'primary.main',
        color: 'white',
        mt: 'auto',
        py: 3
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4} alignItems="center">
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>
              Stock Alert System
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              Real-time stock monitoring and intelligent alerts powered by technical analysis.
            </Typography>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', justifyContent: { xs: 'center', md: 'flex-end' }, gap: 1 }}>
              <IconButton
                color="inherit"
                href="mailto:support@stockalert.com"
                sx={{ opacity: 0.8, '&:hover': { opacity: 1 } }}
              >
                <Email />
              </IconButton>
              <IconButton
                color="inherit"
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                sx={{ opacity: 0.8, '&:hover': { opacity: 1 } }}
              >
                <GitHub />
              </IconButton>
              <IconButton
                color="inherit"
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                sx={{ opacity: 0.8, '&:hover': { opacity: 1 } }}
              >
                <LinkedIn />
              </IconButton>
              <IconButton
                color="inherit"
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                sx={{ opacity: 0.8, '&:hover': { opacity: 1 } }}
              >
                <Twitter />
              </IconButton>
            </Box>
          </Grid>
        </Grid>
        
        <Box
          sx={{
            mt: 3,
            pt: 2,
            borderTop: '1px solid rgba(255,255,255,0.2)',
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 2
          }}
        >
          <Typography variant="body2" sx={{ opacity: 0.8 }}>
            © 2025 Stock Alert System. All rights reserved.
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 3 }}>
            <Link
              href="/privacy"
              color="inherit"
              underline="hover"
              sx={{ opacity: 0.8, '&:hover': { opacity: 1 } }}
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              color="inherit"
              underline="hover"
              sx={{ opacity: 0.8, '&:hover': { opacity: 1 } }}
            >
              Terms of Service
            </Link>
            <Link
              href="/contact"
              color="inherit"
              underline="hover"
              sx={{ opacity: 0.8, '&:hover': { opacity: 1 } }}
            >
              Contact
            </Link>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;
