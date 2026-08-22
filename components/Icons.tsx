import { forwardRef } from 'react';
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';
import rawSolar from '@iconify-json/solar/icons.json';

type SolarIconSet = {
  icons: Record<string, { body: string; width?: number; height?: number }>;
};

const solar = rawSolar as SolarIconSet;

export type SolarIconProps = SvgIconProps & {
  strokeWidth?: string | number;
};

const createIcon = (iconName: string) => {
  const icon = solar.icons[iconName];
  if (!icon) {
    throw new Error(`Solar icon not found: ${iconName}`);
  }
  return forwardRef<SVGSVGElement, SolarIconProps>(function SolarIcon(
    { strokeWidth, ...props },
    ref,
  ) {
    const body =
      strokeWidth !== undefined
        ? icon.body.replace(/stroke-width="[^"]+"/g, `stroke-width="${strokeWidth}"`)
        : icon.body;
    return (
      <SvgIcon
        {...props}
        ref={ref}
        viewBox={`0 0 ${icon.width || 24} ${icon.height || 24}`}
      >
        <g dangerouslySetInnerHTML={{ __html: body }} />
      </SvgIcon>
    );
  });
};

// Navigation / App chrome
export const MenuIcon = createIcon('hamburger-menu-line-duotone');
export const ChevronLeftIcon = createIcon('alt-arrow-left-line-duotone');
export const ChevronRightIcon = createIcon('alt-arrow-right-line-duotone');
export const HomeIcon = createIcon('home-line-duotone');
export const TripsIcon = createIcon('suitcase-line-duotone');
export const SettingsIcon = createIcon('settings-bold-duotone');
export const LightModeIcon = createIcon('sun-line-duotone');
export const DarkModeIcon = createIcon('moon-line-duotone');
export const NotificationsIcon = createIcon('bell-line-duotone');
export const PersonIcon = createIcon('user-line-duotone');
export const SearchIcon = createIcon('magnifer-line-duotone');
export const ArrowBackIcon = createIcon('arrow-left-line-duotone');
export const DocumentsIcon = createIcon('folder-with-files-line-duotone');

// Actions
export const AddIcon = createIcon('add-circle-line-duotone');
export const EditIcon = createIcon('pen-new-square-line-duotone');
export const DeleteIcon = createIcon('trash-bin-trash-line-duotone');
export const ShareIcon = createIcon('share-line-duotone');
export const PrintIcon = createIcon('printer-line-duotone');
export const LinkIcon = createIcon('link-line-duotone');
export const MergeIcon = createIcon('branching-paths-down-line-duotone');
export const MoveIcon = createIcon('card-transfer-line-duotone');
export const CopyEventIcon = createIcon('copy-line-duotone');
export const MoreHorizIcon = createIcon('menu-dots-line-duotone');
export const CloseIcon = createIcon('close-circle-line-duotone');
export const ExpandMoreIcon = createIcon('alt-arrow-down-line-duotone');
export const UnfoldMoreIcon = createIcon('sort-vertical-line-duotone');
export const CheckIcon = createIcon('check-read-line-duotone');
export const RemoveIcon = createIcon('minus-square-line-duotone');
export const CheckBoxOutlineBlankIcon = createIcon('minimize-square-line-duotone');

// Ratings / Favorites
export const StarIcon = createIcon('star-line-duotone');
export const FavoriteIcon = createIcon('heart-line-duotone');

// Communication
export const MailIcon = createIcon('letter-line-duotone');
export const VideoCallIcon = createIcon('video-frame-line-duotone');
export const MeetingIcon = createIcon('video-frame-line-duotone');

// Travel / Transportation
export const LocationIcon = createIcon('map-point-line-duotone');
export const MapIcon = createIcon('map-line-duotone');
export const FlightIcon = createIcon('plain-line-duotone');
export const FlightTakeoffIcon = createIcon('plain-line-duotone');
export const CarIcon = createIcon('delivery-line-duotone');
export const HotelIcon = createIcon('bed-line-duotone');
export const RailIcon = createIcon('tram-line-duotone');
export const BusIcon = createIcon('bus-line-duotone');
export const CruiseIcon = createIcon('route-line-duotone');
export const FerryIcon = createIcon('route-line-duotone');
export const DirectionsIcon = createIcon('route-line-duotone');
export const ParkingIcon = createIcon('minimize-square-line-duotone');
export const LuggageIcon = createIcon('suitcase-line-duotone');
export const PublicIcon = createIcon('earth-line-duotone');
export const TourIcon = createIcon('flag-line-duotone');
export const ClockIcon = createIcon('clock-circle-line-duotone');
export const FlagIcon = createIcon('flag-line-duotone');

// Activities / Entertainment
export const ActivityIcon = createIcon('ticket-line-duotone');
export const RestaurantIcon = createIcon('chef-hat-line-duotone');
export const NoteIcon = createIcon('document-text-line-duotone');
export const MusicIcon = createIcon('music-note-line-duotone');
export const MusicNoteIcon = createIcon('music-note-line-duotone');
export const ConcertIcon = createIcon('music-note-line-duotone');
export const TheaterIcon = createIcon('clapperboard-text-line-duotone');
export const TheatersIcon = createIcon('clapperboard-text-line-duotone');

// Aliases used in design-system/page.tsx
export const Star = StarIcon;
export const Home = HomeIcon;
export const Person = PersonIcon;
export const Settings = SettingsIcon;
export const Notifications = NotificationsIcon;
export const Favorite = FavoriteIcon;
export const Add = AddIcon;
export const Mail = MailIcon;
export const ExpandMore = ExpandMoreIcon;
export const ChevronLeft = ChevronLeftIcon;
export const ChevronRight = ChevronRightIcon;

// Aliases used in MUI customizations
export const CheckBoxOutlineBlankRoundedIcon = CheckBoxOutlineBlankIcon;
export const CheckRoundedIcon = CheckIcon;
export const RemoveRoundedIcon = RemoveIcon;
export const UnfoldMoreRoundedIcon = UnfoldMoreIcon;
