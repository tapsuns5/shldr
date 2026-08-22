'use client';

import { Container, Box, Typography, Stack, Divider, Paper } from '@/components/ui';
import { Button, ButtonGroup, TextField, Checkbox, Switch, Slider, Rating, Select, MenuItem, FormControl, InputLabel } from '@/components/ui';
import { Avatar, Badge, Chip, Tooltip, Card, CardContent, CardHeader, CardActions } from '@/components/ui';
import { Alert, Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress, LinearProgress, Skeleton } from '@/components/ui';
import { Accordion, AccordionSummary, AccordionDetails, AppBar, Toolbar, IconButton, List, ListItem, ListItemText, ListItemIcon } from '@/components/ui';
import { Tabs, Tab, Menu, Breadcrumbs, Link, Drawer, Pagination, Stepper, Step, StepLabel } from '@/components/ui';
import { Grid, Stack as MuiStack, Fab, RadioGroup, FormControlLabel, Radio } from '@/components/ui';
import { Star, Home, Person, Settings, Notifications, Favorite, Add, Mail, ExpandMore, MenuIcon } from '@/components/Icons';
import { useState } from 'react';

export default function DesignSystem() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [ratingValue, setRatingValue] = useState(2);
  const [switchChecked, setSwitchChecked] = useState(false);
  const [sliderValue, setSliderValue] = useState(50);
  const [selectValue, setSelectValue] = useState('');

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h2" gutterBottom>
        Design System
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        A comprehensive showcase of all MUI components and their variations.
      </Typography>

      <Divider sx={{ my: 4 }} />

      {/* Typography */}
      <Box sx={{ mb: 8 }}>
        <Typography variant="h3" gutterBottom>
          Typography
        </Typography>
        <Paper sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Typography variant="h1">Heading 1</Typography>
            <Typography variant="h2">Heading 2</Typography>
            <Typography variant="h3">Heading 3</Typography>
            <Typography variant="h4">Heading 4</Typography>
            <Typography variant="h5">Heading 5</Typography>
            <Typography variant="h6">Heading 6</Typography>
            <Typography variant="subtitle1">Subtitle 1</Typography>
            <Typography variant="subtitle2">Subtitle 2</Typography>
            <Typography variant="body1">Body 1 - Lorem ipsum dolor sit amet, consectetur adipiscing elit.</Typography>
            <Typography variant="body2">Body 2 - Lorem ipsum dolor sit amet, consectetur adipiscing elit.</Typography>
            <Typography variant="caption">Caption text</Typography>
            <Typography variant="overline">Overline text</Typography>
            <Typography variant="button">Button text</Typography>
          </Stack>
        </Paper>
      </Box>

      {/* Buttons */}
      <Box sx={{ mb: 8 }}>
        <Typography variant="h3" gutterBottom>
          Buttons
        </Typography>
        <Paper sx={{ p: 3 }}>
          <Stack spacing={3}>
            <Box>
              <Typography variant="h6" gutterBottom>Button Variants</Typography>
              <Stack direction="row" spacing={2} flexWrap="wrap">
                <Button variant="text">Text</Button>
                <Button variant="contained">Contained</Button>
                <Button variant="outlined">Outlined</Button>
              </Stack>
            </Box>
            <Box>
              <Typography variant="h6" gutterBottom>Button Colors</Typography>
              <Stack direction="row" spacing={2} flexWrap="wrap">
                <Button variant="contained" color="primary">Primary</Button>
                <Button variant="contained" color="secondary">Secondary</Button>
                <Button variant="contained" color="success">Success</Button>
                <Button variant="contained" color="error">Error</Button>
                <Button variant="contained" color="info">Info</Button>
                <Button variant="contained" color="warning">Warning</Button>
              </Stack>
            </Box>
            <Box>
              <Typography variant="h6" gutterBottom>Button Sizes</Typography>
              <Stack direction="row" spacing={2} alignItems="center">
                <Button size="small">Small</Button>
                <Button size="medium">Medium</Button>
                <Button size="large">Large</Button>
              </Stack>
            </Box>
            <Box>
              <Typography variant="h6" gutterBottom>Button Group</Typography>
              <ButtonGroup variant="outlined">
                <Button>Left</Button>
                <Button>Center</Button>
                <Button>Right</Button>
              </ButtonGroup>
            </Box>
            <Box>
              <Typography variant="h6" gutterBottom>FAB (Floating Action Button)</Typography>
              <Stack direction="row" spacing={2}>
                <Fab color="primary" size="small">
                  <Add />
                </Fab>
                <Fab color="primary">
                  <Add />
                </Fab>
                <Fab color="secondary">
                  <Add />
                </Fab>
              </Stack>
            </Box>
          </Stack>
        </Paper>
      </Box>

      {/* Form Components */}
      <Box sx={{ mb: 8 }}>
        <Typography variant="h3" gutterBottom>
          Form Components
        </Typography>
        <Paper sx={{ p: 3 }}>
          <Stack spacing={3}>
            <Box>
              <Typography variant="h6" gutterBottom>Text Fields</Typography>
              <Stack spacing={2}>
                <TextField label="Standard" variant="standard" />
                <TextField label="Filled" variant="filled" />
                <TextField label="Outlined" variant="outlined" />
                <TextField label="With Error" variant="outlined" error helperText="This field is required" />
                <TextField label="Disabled" variant="outlined" disabled />
              </Stack>
            </Box>
            <Box>
              <Typography variant="h6" gutterBottom>Checkbox & Switch</Typography>
              <Stack direction="row" spacing={3} alignItems="center">
                <Checkbox defaultChecked />
                <Checkbox />
                <Checkbox disabled />
                <Switch checked={switchChecked} onChange={(e: any) => setSwitchChecked(e.target.checked)} />
                <Switch disabled />
              </Stack>
            </Box>
            <Box>
              <Typography variant="h6" gutterBottom>Radio Group</Typography>
              <RadioGroup defaultValue="option1">
                <FormControlLabel value="option1" control={<Radio />} label="Option 1" />
                <FormControlLabel value="option2" control={<Radio />} label="Option 2" />
                <FormControlLabel value="option3" control={<Radio />} label="Option 3" />
              </RadioGroup>
            </Box>
            <Box>
              <Typography variant="h6" gutterBottom>Select</Typography>
              <FormControl fullWidth>
                <InputLabel>Choose an option</InputLabel>
                <Select
                  value={selectValue}
                  label="Choose an option"
                  onChange={(e: any) => setSelectValue(e.target.value)}
                >
                  <MenuItem value="">None</MenuItem>
                  <MenuItem value="option1">Option 1</MenuItem>
                  <MenuItem value="option2">Option 2</MenuItem>
                  <MenuItem value="option3">Option 3</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box>
              <Typography variant="h6" gutterBottom>Slider</Typography>
              <Box sx={{ width: 300 }}>
                <Slider
                  value={sliderValue}
                  onChange={(e: any, value: any) => setSliderValue(value as number)}
                  valueLabelDisplay="auto"
                />
              </Box>
            </Box>
            <Box>
              <Typography variant="h6" gutterBottom>Rating</Typography>
              <Rating
                value={ratingValue}
                onChange={(e: any, value: any) => setRatingValue(value || 0)}
              />
            </Box>
          </Stack>
        </Paper>
      </Box>

      {/* Data Display */}
      <Box sx={{ mb: 8 }}>
        <Typography variant="h3" gutterBottom>
          Data Display
        </Typography>
        <Paper sx={{ p: 3 }}>
          <Stack spacing={3}>
            <Box>
              <Typography variant="h6" gutterBottom>Avatars</Typography>
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar>U</Avatar>
                <Avatar sx={{ bgcolor: 'primary.main' }}>U</Avatar>
                <Avatar src="https://i.pravatar.cc/150?img=1" />
                <Avatar variant="square">U</Avatar>
              </Stack>
            </Box>
            <Box>
              <Typography variant="h6" gutterBottom>Badges</Typography>
              <Stack direction="row" spacing={3}>
                <Badge badgeContent={4} color="primary">
                  <Notifications />
                </Badge>
                <Badge badgeContent={99} color="secondary">
                  <Mail />
                </Badge>
                <Badge variant="dot" color="success">
                  <Notifications />
                </Badge>
              </Stack>
            </Box>
            <Box>
              <Typography variant="h6" gutterBottom>Chips</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Chip label="Default" />
                <Chip label="Primary" color="primary" />
                <Chip label="Secondary" color="secondary" />
                <Chip label="Success" color="success" />
                <Chip label="Error" color="error" />
                <Chip label="Deletable" onDelete={() => {}} />
                <Chip avatar={<Avatar>U</Avatar>} label="With Avatar" />
              </Stack>
            </Box>
            <Box>
              <Typography variant="h6" gutterBottom>Tooltip</Typography>
              <Tooltip title="This is a tooltip">
                <Button>Hover me</Button>
              </Tooltip>
            </Box>
            <Box>
              <Typography variant="h6" gutterBottom>List</Typography>
              <List>
                <ListItem>
                  <ListItemIcon><Person /></ListItemIcon>
                  <ListItemText primary="Profile" secondary="View your profile" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><Settings /></ListItemIcon>
                  <ListItemText primary="Settings" secondary="Manage your settings" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><Favorite /></ListItemIcon>
                  <ListItemText primary="Favorites" secondary="Your favorite items" />
                </ListItem>
              </List>
            </Box>
          </Stack>
        </Paper>
      </Box>

      {/* Feedback */}
      <Box sx={{ mb: 8 }}>
        <Typography variant="h3" gutterBottom>
          Feedback Components
        </Typography>
        <Paper sx={{ p: 3 }}>
          <Stack spacing={3}>
            <Box>
              <Typography variant="h6" gutterBottom>Alerts</Typography>
              <Stack spacing={2}>
                <Alert severity="success">This is a success alert.</Alert>
                <Alert severity="info">This is an info alert.</Alert>
                <Alert severity="warning">This is a warning alert.</Alert>
                <Alert severity="error">This is an error alert.</Alert>
              </Stack>
            </Box>
            <Box>
              <Typography variant="h6" gutterBottom>Progress</Typography>
              <Stack spacing={2}>
                <CircularProgress />
                <CircularProgress variant="determinate" value={75} />
                <LinearProgress />
                <LinearProgress variant="determinate" value={50} />
              </Stack>
            </Box>
            <Box>
              <Typography variant="h6" gutterBottom>Skeleton</Typography>
              <Stack spacing={2}>
                <Skeleton variant="text" width={200} />
                <Skeleton variant="circular" width={40} height={40} />
                <Skeleton variant="rectangular" width={210} height={60} />
              </Stack>
            </Box>
            <Box>
              <Typography variant="h6" gutterBottom>Dialog</Typography>
              <Button variant="contained" onClick={() => setDialogOpen(true)}>
                Open Dialog
              </Button>
              <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
                <DialogTitle>Dialog Title</DialogTitle>
                <DialogContent>
                  <Typography>This is the dialog content.</Typography>
                </DialogContent>
                <DialogActions>
                  <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button variant="contained" onClick={() => setDialogOpen(false)}>Confirm</Button>
                </DialogActions>
              </Dialog>
            </Box>
          </Stack>
        </Paper>
      </Box>

      {/* Surface Components */}
      <Box sx={{ mb: 8 }}>
        <Typography variant="h3" gutterBottom>
          Surface Components
        </Typography>
        <Paper sx={{ p: 3 }}>
          <Stack spacing={3}>
            <Box>
              <Typography variant="h6" gutterBottom>Cards</Typography>
              <Stack direction="row" spacing={2} flexWrap="wrap">
                <Card sx={{ minWidth: 300, flex: 1 }}>
                  <CardHeader title="Card Title" subheader="September 14, 2023" />
                  <CardContent>
                    <Typography variant="body2" color="text.secondary">
                      This is a card with content. You can put any content here.
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button size="small">Learn More</Button>
                  </CardActions>
                </Card>
                <Card sx={{ minWidth: 300, flex: 1, bgcolor: 'primary.main', color: 'white' }}>
                  <CardContent>
                    <Typography variant="h5">Primary Card</Typography>
                    <Typography variant="body2">Themed card</Typography>
                  </CardContent>
                </Card>
              </Stack>
            </Box>
            <Box>
              <Typography variant="h6" gutterBottom>Accordion</Typography>
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography>Accordion 1</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography>Content for accordion 1</Typography>
                </AccordionDetails>
              </Accordion>
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography>Accordion 2</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography>Content for accordion 2</Typography>
                </AccordionDetails>
              </Accordion>
            </Box>
            <Box>
              <Typography variant="h6" gutterBottom>App Bar</Typography>
              <AppBar position="static">
                <Toolbar>
                  <IconButton edge="start" color="inherit">
                    <MenuIcon />
                  </IconButton>
                  <Typography variant="h6" sx={{ flexGrow: 1 }}>
                    App Bar
                  </Typography>
                  <IconButton color="inherit">
                    <Notifications />
                  </IconButton>
                  <IconButton color="inherit">
                    <Settings />
                  </IconButton>
                </Toolbar>
              </AppBar>
            </Box>
          </Stack>
        </Paper>
      </Box>

      {/* Navigation */}
      <Box sx={{ mb: 8 }}>
        <Typography variant="h3" gutterBottom>
          Navigation Components
        </Typography>
        <Paper sx={{ p: 3 }}>
          <Stack spacing={3}>
            <Box>
              <Typography variant="h6" gutterBottom>Tabs</Typography>
              <Box sx={{ width: '100%' }}>
                <Tabs value={tabValue} onChange={(e: any, value: any) => setTabValue(value)}>
                  <Tab label="Tab 1" />
                  <Tab label="Tab 2" />
                  <Tab label="Tab 3" />
                </Tabs>
                <Box sx={{ py: 2 }}>
                  <Typography>Tab {tabValue + 1} content</Typography>
                </Box>
              </Box>
            </Box>
            <Box>
              <Typography variant="h6" gutterBottom>Breadcrumbs</Typography>
              <Breadcrumbs>
                <Link href="#" underline="hover">Home</Link>
                <Link href="#" underline="hover">Category</Link>
                <Typography color="text.primary">Current Page</Typography>
              </Breadcrumbs>
            </Box>
            <Box>
              <Typography variant="h6" gutterBottom>Pagination</Typography>
              <Stack spacing={2}>
                <Pagination count={10} />
                <Pagination count={10} color="primary" />
                <Pagination count={10} variant="outlined" />
              </Stack>
            </Box>
            <Box>
              <Typography variant="h6" gutterBottom>Stepper</Typography>
              <Stepper activeStep={1}>
                <Step>
                  <StepLabel>Step 1</StepLabel>
                </Step>
                <Step>
                  <StepLabel>Step 2</StepLabel>
                </Step>
                <Step>
                  <StepLabel>Step 3</StepLabel>
                </Step>
              </Stepper>
            </Box>
          </Stack>
        </Paper>
      </Box>

      {/* Layout */}
      <Box sx={{ mb: 8 }}>
        <Typography variant="h3" gutterBottom>
          Layout Components
        </Typography>
        <Paper sx={{ p: 3 }}>
          <Stack spacing={3}>
            <Box>
              <Typography variant="h6" gutterBottom>Stack</Typography>
              <MuiStack direction="row" spacing={2}>
                <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white' }}>Item 1</Box>
                <Box sx={{ p: 2, bgcolor: 'secondary.main', color: 'white' }}>Item 2</Box>
                <Box sx={{ p: 2, bgcolor: 'success.main', color: 'white' }}>Item 3</Box>
              </MuiStack>
            </Box>
            <Box>
              <Typography variant="h6" gutterBottom>Grid (simplified with Stack)</Typography>
              <MuiStack direction="row" spacing={2} flexWrap="wrap">
                <Box sx={{ p: 2, bgcolor: 'grey.200', textAlign: 'center', minWidth: 100, flex: 1 }}>Grid Item 1</Box>
                <Box sx={{ p: 2, bgcolor: 'grey.300', textAlign: 'center', minWidth: 100, flex: 1 }}>Grid Item 2</Box>
                <Box sx={{ p: 2, bgcolor: 'grey.200', textAlign: 'center', minWidth: 100, flex: 1 }}>Grid Item 3</Box>
              </MuiStack>
            </Box>
            <Box>
              <Typography variant="h6" gutterBottom>Box</Typography>
              <Box sx={{ p: 3, bgcolor: 'info.main', color: 'white', borderRadius: 1 }}>
                This is a Box component with custom styling
              </Box>
            </Box>
          </Stack>
        </Paper>
      </Box>

      {/* Icons */}
      <Box sx={{ mb: 8 }}>
        <Typography variant="h3" gutterBottom>
          Icons
        </Typography>
        <Paper sx={{ p: 3 }}>
          <Stack direction="row" spacing={3} flexWrap="wrap">
            <Home fontSize="small" />
            <Home fontSize="medium" />
            <Home fontSize="large" />
            <Person />
            <Settings />
            <Notifications />
            <Favorite />
            <Star />
          </Stack>
        </Paper>
      </Box>
    </Container>
  );
}
