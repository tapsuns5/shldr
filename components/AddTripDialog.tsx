'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  Alert,
  CircularProgress,
  Popover,
  Box,
  Chip,
  Typography,
  Tabs,
  Tab,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import { CloseIcon, LocationIcon } from '@/components/Icons';
import { LocalizationProvider, DateCalendar } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import LocationInput, { LocationResult } from './LocationInput';

interface AddTripDialogProps {
  open: boolean;
  onClose: () => void;
  accountId: string;
  onTripCreated?: (trip: any) => void;
}

export default function AddTripDialog({
  open,
  onClose,
  accountId,
  onTripCreated,
}: AddTripDialogProps) {
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState<Dayjs | null>(null);
  const [endDate, setEndDate] = useState<Dayjs | null>(null);
  const [destinations, setDestinations] = useState<LocationResult[]>([]);
  const [locationInputKey, setLocationInputKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startAnchor, setStartAnchor] = useState<HTMLElement | null>(null);
  const [endAnchor, setEndAnchor] = useState<HTMLElement | null>(null);

  const [activeTab, setActiveTab] = useState<'create' | 'import'>('create');
  const [importSource, setImportSource] = useState<'csv' | 'xlsx' | 'google'>('csv');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const [googleSheetUrl, setGoogleSheetUrl] = useState('');

  const resetForm = () => {
    setTitle('');
    setStartDate(null);
    setEndDate(null);
    setDestinations([]);
    setLocationInputKey((k) => k + 1);
    setError(null);
    setStartAnchor(null);
    setEndAnchor(null);
    setActiveTab('create');
    setImportSource('csv');
    setImportFile(null);
    setImportFileName(null);
    setGoogleSheetUrl('');
  };

  const handleAddDestination = (loc: LocationResult | null) => {
    if (!loc) return;
    setDestinations((prev) => [...prev, loc]);
    setLocationInputKey((k) => k + 1);
  };

  const handleRemoveDestination = (index: number) => {
    setDestinations((prev) => prev.filter((_, i) => i !== index));
  };

  const postJson = async (url: string, payload: any) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const data = await response.json();
      const validationError = data.error?.formErrors?.[0]
        || Object.values(data.error?.fieldErrors || {}).flat()[0];
      throw new Error(validationError || data.error || `Request failed (${response.status})`);
    }

    return response.json();
  };

  const createTripRequest = async (payload: any) => postJson('/api/trips', payload);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const EXAMPLE_INSTRUCTIONS = [
    'Import Instructions',
    'Each row represents one trip, destination, note, or reservation.',
    'Rows with the same title, start_date, and end_date are grouped into the same trip.',
    'Required columns: title, start_date, end_date.',
    'Optional trip columns: description, status, origin_airport, cover_image.',
    'Optional destination columns: destination_city, destination_state, destination_country, arrival_date, departure_date.',
    'Optional note columns: note_title, note_content.',
    'Optional reservation columns: reservation_type, reservation_title, reservation_confirmation_number, reservation_provider_name, reservation_start_datetime, reservation_end_datetime, reservation_location, reservation_notes, reservation_currency, reservation_total_cost.',
    'Notes: basic notes are imported. Rich/formatted note content is not supported.',
    'Reservations: basic reservation details are imported. Type-specific details (flight segments, hotel rooms, etc.) are not supported.',
  ];

  const EXAMPLE_ROWS = [
    [
      'title',
      'description',
      'status',
      'start_date',
      'end_date',
      'origin_airport',
      'cover_image',
      'destination_city',
      'destination_state',
      'destination_country',
      'arrival_date',
      'departure_date',
      'note_title',
      'note_content',
      'reservation_type',
      'reservation_title',
      'reservation_confirmation_number',
      'reservation_provider_name',
      'reservation_start_datetime',
      'reservation_end_datetime',
      'reservation_location',
      'reservation_notes',
      'reservation_currency',
      'reservation_total_cost',
    ],
    [
      'Paris & Tokyo Adventure',
      'Two-city summer adventure',
      'confirmed',
      '2026-07-10',
      '2026-07-20',
      'JFK',
      'https://example.com/cover.jpg',
      'Paris',
      'Île-de-France',
      'France',
      '2026-07-10',
      '2026-07-15',
      'Packing list',
      'Bring sunscreen and adapters',
      'flight',
      'Flight to Paris',
      'ABC123',
      'Air France',
      '2026-07-10 08:30',
      '2026-07-10 20:45',
      'CDG',
      'Window seat',
      'USD',
      '850.00',
    ],
    [
      'Paris & Tokyo Adventure',
      'Two-city summer adventure',
      'confirmed',
      '2026-07-10',
      '2026-07-20',
      'JFK',
      'https://example.com/cover.jpg',
      'Tokyo',
      '',
      'Japan',
      '2026-07-16',
      '2026-07-20',
      'Visa info',
      'Check Japan visa requirements',
      'hotel',
      'Hotel in Tokyo',
      'XYZ789',
      'Park Hotel Tokyo',
      '2026-07-16 15:00',
      '2026-07-20 11:00',
      'Shinjuku',
      'Non-smoking',
      'JPY',
      '120000',
    ],
  ];

  const normalizeKey = (key: string) =>
    key.toLowerCase().replace(/[\s_]/g, '').replace(/[^a-z0-9]/g, '');

  const toCellValue = (value: unknown): string | undefined => {
    if (value === null || value === undefined) return undefined;
    if (value instanceof Date) return dayjs(value).format('YYYY-MM-DD');
    const str = String(value).trim();
    return str.length > 0 ? str : undefined;
  };

  const parseCsvText = (text: string): string[][] => {
    const parsed = Papa.parse<string[]>(text, {
      skipEmptyLines: true,
      comments: '#',
    });
    return parsed.data;
  };

  const readXlsxFile = (file: File): Promise<string[][]> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = e.target?.result;
        if (!(data instanceof ArrayBuffer)) {
          reject(new Error('Failed to read Excel file'));
          return;
        }
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });
        const stringRows = rows.map((row) =>
          (row || []).map((cell) => toCellValue(cell) ?? '')
        );
        resolve(stringRows);
      };
      reader.onerror = () => reject(new Error('Failed to read Excel file'));
      reader.readAsArrayBuffer(file);
    });

  const rowsToObjects = (rows: string[][]): Record<string, string>[] => {
    if (rows.length < 2) return [];
    const headers = rows[0].map(normalizeKey);
    return rows
      .slice(1)
      .filter((row) => !row[0]?.startsWith('#'))
      .map((row) => {
        const obj: Record<string, string> = {};
        headers.forEach((header, idx) => {
          if (header) {
            const value = row[idx];
            if (value !== undefined && value !== '') obj[header] = value;
          }
        });
        return obj;
      });
  };

  const parseDate = (value: string | undefined): string | null => {
    if (!value) return null;
    const parsed = dayjs(value);
    return parsed.isValid() ? parsed.format('YYYY-MM-DD') : null;
  };

  const parseDateTime = (value: string | undefined): string | null => {
    if (!value) return null;
    const parsed = dayjs(value);
    return parsed.isValid() ? parsed.toISOString() : null;
  };

  const getValue = (row: Record<string, string>, ...keys: string[]) => {
    for (const key of keys) {
      if (row[key] !== undefined) return row[key];
    }
    return undefined;
  };

  const VALID_STATUSES = ['planning', 'confirmed', 'active', 'completed', 'cancelled'];
  const VALID_RESERVATION_TYPES = [
    'flight', 'hotel', 'car', 'rail', 'cruise', 'activity', 'restaurant', 'transport', 'other',
  ];

  const parseImportRows = (objects: Record<string, string>[]) => {
    const groups = new Map<
      string,
      {
        title: string;
        description?: string;
        status?: string;
        startDate: string;
        endDate: string;
        originAirport?: string;
        coverImage?: string;
        destinations: {
          city: string;
          state?: string;
          country: string;
          arrivalDate?: string;
          departureDate?: string;
        }[];
        notes: { title: string; content?: string }[];
        reservations: {
          type: string;
          title: string;
          confirmationNumber?: string;
          providerName?: string;
          startDateTime: string;
          endDateTime?: string;
          location?: string;
          notes?: string;
          currency?: string;
          totalCost?: string;
        }[];
      }
    >();

    for (const row of objects) {
      const title = getValue(row, 'title', 'tripname', 'name');
      const startDate = parseDate(getValue(row, 'startdate', 'start'));
      const endDate = parseDate(getValue(row, 'enddate', 'end'));

      if (!title || !startDate || !endDate) {
        throw new Error('Each row must have title, start_date, and end_date');
      }
      if (dayjs(endDate).isBefore(startDate)) {
        throw new Error(`End date must be after start date for trip "${title}"`);
      }

      const key = `${title}|${startDate}|${endDate}`;
      let group = groups.get(key);
      if (!group) {
        group = {
          title,
          startDate,
          endDate,
          destinations: [],
          notes: [],
          reservations: [],
        };
        groups.set(key, group);
      }

      const description = getValue(row, 'description');
      if (description && group.description === undefined) group.description = description;

      const status = getValue(row, 'status');
      if (status && group.status === undefined) group.status = status;

      const originAirport = getValue(row, 'originairport', 'origin');
      if (originAirport && group.originAirport === undefined) group.originAirport = originAirport;

      const coverImage = getValue(row, 'coverimage', 'cover');
      if (coverImage && group.coverImage === undefined) group.coverImage = coverImage;

      const destCity = getValue(row, 'destinationcity', 'destcity', 'city');
      const destCountry = getValue(row, 'destinationcountry', 'destcountry', 'country');
      if (destCity && destCountry) {
        group.destinations.push({
          city: destCity,
          state: getValue(row, 'destinationstate', 'deststate', 'state'),
          country: destCountry,
          arrivalDate: parseDate(getValue(row, 'arrivaldate', 'arrival')) || undefined,
          departureDate: parseDate(getValue(row, 'departuredate', 'departure')) || undefined,
        });
      }

      const noteTitle = getValue(row, 'notetitle');
      if (noteTitle) {
        group.notes.push({
          title: noteTitle,
          content: getValue(row, 'notecontent', 'notebody'),
        });
      }

      const reservationType = getValue(row, 'reservationtype', 'type');
      const reservationTitle = getValue(row, 'reservationtitle', 'reservationname');
      if (reservationType && reservationTitle) {
        if (!VALID_RESERVATION_TYPES.includes(reservationType)) {
          throw new Error(
            `Unsupported reservation type "${reservationType}" for trip "${title}". Use: ${VALID_RESERVATION_TYPES.join(', ')}`
          );
        }
        const startDateTime = parseDateTime(
          getValue(row, 'reservationstartdatetime', 'reservationstart', 'startdatetime')
        );
        if (!startDateTime) {
          throw new Error(
            `Reservation "${reservationTitle}" for trip "${title}" must have a valid start datetime`
          );
        }
        group.reservations.push({
          type: reservationType,
          title: reservationTitle,
          confirmationNumber: getValue(row, 'reservationconfirmationnumber', 'confirmationnumber'),
          providerName: getValue(row, 'reservationprovidername', 'providername'),
          startDateTime,
          endDateTime:
            parseDateTime(
              getValue(row, 'reservationenddatetime', 'reservationend', 'enddatetime')
            ) || undefined,
          location: getValue(row, 'reservationlocation', 'reservationcity', 'location'),
          notes: getValue(row, 'reservationnotes', 'reservationnote'),
          currency: getValue(row, 'reservationcurrency', 'currency'),
          totalCost: getValue(row, 'reservationtotalcost', 'totalcost', 'cost'),
        });
      }
    }

    return Array.from(groups.values()).map((g) => ({
      accountId,
      title: g.title,
      description: g.description,
      status: VALID_STATUSES.includes(g.status || '') ? g.status : 'planning',
      startDate: g.startDate,
      endDate: g.endDate,
      originAirport: g.originAirport,
      coverImage: g.coverImage,
      destinationCity: g.destinations[0]?.city || null,
      destinationCountry: g.destinations[0]?.country || null,
      destinations: g.destinations.length > 0 ? g.destinations : undefined,
      notes: g.notes,
      reservations: g.reservations,
    }));
  };

  const downloadExample = () => {
    const instructionRows = EXAMPLE_INSTRUCTIONS.map((line) => [`# ${line}`]);
    const csvRows = EXAMPLE_ROWS.map((row) => row.map((cell) => {
      const str = String(cell);
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"`
        : str;
    }).join(','));

    if (importSource === 'xlsx') {
      const exampleSheetRows = [...EXAMPLE_ROWS, [''], ...instructionRows];
      const worksheet = XLSX.utils.aoa_to_sheet(exampleSheetRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Trips');
      XLSX.writeFile(workbook, 'trip-import-example.xlsx');
      return;
    }

    const csv = [...csvRows, ...instructionRows.map((row) => row[0])].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'trip-import-example.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSubmit = async () => {
    if (!accountId) {
      setError('No account selected. Please reload the page and try again.');
      return;
    }
    if (!title.trim()) {
      setError('Trip name is required');
      return;
    }
    if (!startDate || !endDate) {
      setError('Start and end dates are required');
      return;
    }
    if (endDate.isBefore(startDate)) {
      setError('End date must be after start date');
      return;
    }
    if (destinations.length === 0) {
      setError('Please add at least one destination');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const firstDest = destinations[0];
      const trip = await createTripRequest({
        accountId,
        title: title.trim(),
        startDate: startDate.format('YYYY-MM-DD'),
        endDate: endDate.format('YYYY-MM-DD'),
        destinationCity: firstDest.city,
        destinationCountry: firstDest.country,
        status: 'planning',
        destinations: destinations.map((d) => ({
          city: d.city,
          state: d.state,
          country: d.country,
        })),
      });

      onTripCreated?.(trip);
      resetForm();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!accountId) {
      setError('No account selected. Please reload the page and try again.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let rows: string[][] = [];
      if (importSource === 'csv') {
        if (!importFile) throw new Error('Please select a CSV file');
        const text = await importFile.text();
        rows = parseCsvText(text);
      } else if (importSource === 'xlsx') {
        if (!importFile) throw new Error('Please select an Excel file');
        rows = await readXlsxFile(importFile);
      } else {
        if (!googleSheetUrl.trim()) throw new Error('Please enter a Google Sheet URL');
        const res = await fetch('/api/google-sheet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: googleSheetUrl.trim() }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to fetch Google Sheet');
        }
        const { csv } = await res.json();
        rows = parseCsvText(csv);
      }

      const objects = rowsToObjects(rows);
      if (objects.length === 0) {
        throw new Error('No import rows found. Make sure the file has a header row and at least one data row.');
      }

      const payloads = parseImportRows(objects);

      for (const payload of payloads) {
        const { notes, reservations, ...tripPayload } = payload;
        const trip = await createTripRequest(tripPayload);
        onTripCreated?.(trip);

        for (const note of notes) {
          await postJson(`/api/trips/${trip.id}/notes`, note);
        }

        for (const reservation of reservations) {
          await postJson(`/api/trips/${trip.id}/reservations`, {
            ...reservation,
            source: 'api_import',
          });
        }
      }

      resetForm();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Add a Trip</DialogTitle>
      <DialogContent>
        <Tabs
          value={activeTab}
          onChange={(_, value) => value && setActiveTab(value)}
          sx={{ mt: 1 }}
        >
          <Tab value="create" label="Create" />
          <Tab value="import" label="Import" />
        </Tabs>

        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

        {activeTab === 'create' && (
          <Stack spacing={2.5} sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Trip Name"
              placeholder="e.g., Split, Croatia"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />

            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <Stack direction="row" spacing={2}>
                <Box sx={{ flex: 1 }}>
                  <TextField
                    fullWidth
                    label="Start Date"
                    value={startDate ? startDate.format('MM/DD/YYYY') : ''}
                    placeholder="Select start date"
                    onClick={(e) => setStartAnchor(e.currentTarget)}
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ readOnly: true }}
                    required
                  />
                  <Popover
                    open={Boolean(startAnchor)}
                    anchorEl={startAnchor}
                    onClose={() => setStartAnchor(null)}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                    slotProps={{ paper: { sx: { mt: 1 } } }}
                  >
                    <DateCalendar
                      value={startDate}
                      onChange={(newValue) => {
                        setStartDate(newValue);
                        setStartAnchor(null);
                      }}
                      maxDate={endDate || undefined}
                    />
                  </Popover>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <TextField
                    fullWidth
                    label="End Date"
                    value={endDate ? endDate.format('MM/DD/YYYY') : ''}
                    placeholder="Select end date"
                    onClick={(e) => setEndAnchor(e.currentTarget)}
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ readOnly: true }}
                    required
                  />
                  <Popover
                    open={Boolean(endAnchor)}
                    anchorEl={endAnchor}
                    onClose={() => setEndAnchor(null)}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                    slotProps={{ paper: { sx: { mt: 1 } } }}
                  >
                    <DateCalendar
                      value={endDate}
                      onChange={(newValue) => {
                        setEndDate(newValue);
                        setEndAnchor(null);
                      }}
                      minDate={startDate || undefined}
                    />
                  </Popover>
                </Box>
              </Stack>
            </LocalizationProvider>

            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                Destinations
              </Typography>
              {destinations.length > 0 && (
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, mb: 2 }}>
                  {destinations.map((dest, idx) => (
                    <Chip
                      key={idx}
                      icon={<LocationIcon />}
                      label={dest.formattedAddress || `${dest.city}, ${dest.country}`}
                      onDelete={() => handleRemoveDestination(idx)}
                      deleteIcon={<CloseIcon />}
                      sx={{ maxWidth: '100%' }}
                    />
                  ))}
                </Stack>
              )}
              <LocationInput key={locationInputKey} value={null} onChange={handleAddDestination} />
            </Box>
          </Stack>
        )}

        {activeTab === 'import' && (
          <Stack spacing={2.5} sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Import trips, destinations, notes, and basic reservations from a CSV,
              Excel file, or a public Google Sheet. The same column layout works for all three sources.
              Required columns are <strong>title</strong>, <strong>start_date</strong>, and <strong>end_date</strong>.
              Download the example file for the full list of supported columns and limitations.
            </Typography>

            <ToggleButtonGroup
              value={importSource}
              exclusive
              fullWidth
              onChange={(_, value) => value && setImportSource(value)}
            >
              <ToggleButton value="csv">
                <Box component="img" src="/csv-icon.svg" alt="" sx={{ height: 16, width: 'auto', mr: 0.75 }} />
                CSV
              </ToggleButton>
              <ToggleButton value="xlsx">
                <Box component="img" src="/excel-icon.svg" alt="" sx={{ height: 16, width: 'auto', mr: 0.75 }} />
                Excel
              </ToggleButton>
              <ToggleButton value="google">
                <Box component="img" src="/google-sheets-icon.svg" alt="" sx={{ height: 16, width: 'auto', mr: 0.75 }} />
                Google Sheet
              </ToggleButton>
            </ToggleButtonGroup>

            {importSource === 'google' && (
              <TextField
                fullWidth
                label="Google Sheet URL"
                placeholder="https://docs.google.com/spreadsheets/d/..."
                value={googleSheetUrl}
                onChange={(e) => setGoogleSheetUrl(e.target.value)}
                helperText="The sheet must be publicly viewable"
              />
            )}

            {importSource !== 'google' && (
              <Button variant="outlined" component="label" fullWidth>
                {importFileName ? `Selected: ${importFileName}` : `Choose ${importSource === 'csv' ? 'CSV' : 'Excel'} file`}
                <input
                  type="file"
                  hidden
                  accept={
                    importSource === 'csv'
                      ? '.csv,text/csv'
                      : '.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                  }
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setImportFile(file);
                    setImportFileName(file ? file.name : null);
                  }}
                />
              </Button>
            )}

            <Button variant="text" onClick={downloadExample} fullWidth>
              {importSource === 'xlsx'
                ? 'Download example Excel file'
                : 'Download example CSV'}
            </Button>
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={activeTab === 'create' ? handleSubmit : handleImport}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={18} color="inherit" /> : null}
        >
          {loading
            ? (activeTab === 'create' ? 'Creating...' : 'Importing...')
            : (activeTab === 'create' ? 'Create Trip' : 'Import Trip')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
