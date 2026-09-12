'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  LinearProgress,
  Rating,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import type { RankItem, RankView } from '@/hooks/use-ranks';
import {
  ASSISTED_CRITERIA,
  scoreAssistedItems,
  type CriterionWeights,
  type ItemRatings,
} from '@/lib/assisted-rank';

interface AssistedRankDialogProps {
  open: boolean;
  onClose: () => void;
  view: RankView;
  ranked: RankItem[];
  unranked: RankItem[];
  onApply: (rankKeys: string[]) => Promise<void>;
}

const VIEW_LABELS: Record<RankView, string> = {
  trips: 'trips',
  restaurants: 'restaurants',
  cities: 'cities',
  hotels: 'hotels',
  activities: 'activities',
};

const IMPORTANCE_LABELS: Record<number, string> = { 1: 'Low', 2: 'Medium', 3: 'High' };

export default function AssistedRankDialog({
  open,
  onClose,
  view,
  ranked,
  unranked,
  onApply,
}: AssistedRankDialogProps) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const criteria = ASSISTED_CRITERIA[view];
  const allItems = useMemo(() => [...ranked, ...unranked], [ranked, unranked]);
  const [step, setStep] = useState(0);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [weights, setWeights] = useState<CriterionWeights>({});
  const [ratings, setRatings] = useState<ItemRatings>({});
  const [ratingIndex, setRatingIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setSelectedKeys([]);
    setWeights(Object.fromEntries(criteria.map((criterion) => [criterion.id, 2])));
    setRatings({});
    setRatingIndex(0);
    setSaving(false);
    setError(null);
  }, [open, criteria]);

  const selectedItems = selectedKeys
    .map((rankKey) => allItems.find((item) => item.rankKey === rankKey))
    .filter((item): item is RankItem => Boolean(item));
  const currentItem = selectedItems[ratingIndex];
  const results = useMemo(
    () => scoreAssistedItems(selectedItems, criteria, weights, ratings),
    [selectedItems, criteria, weights, ratings],
  );
  const currentComplete = currentItem
    ? criteria.every((criterion) => Boolean(ratings[currentItem.rankKey]?.[criterion.id]))
    : false;

  const toggleItem = (rankKey: string) => {
    setSelectedKeys((current) =>
      current.includes(rankKey)
        ? current.filter((key) => key !== rankKey)
        : current.length < 6
          ? [...current, rankKey]
          : current,
    );
  };

  const setItemRating = (rankKey: string, criterionId: string, value: number) => {
    setRatings((current) => ({
      ...current,
      [rankKey]: { ...current[rankKey], [criterionId]: value },
    }));
  };

  const handleNextRating = () => {
    if (ratingIndex < selectedItems.length - 1) setRatingIndex((index) => index + 1);
    else setStep(3);
  };

  const handleBack = () => {
    setError(null);
    if (step === 2 && ratingIndex > 0) setRatingIndex((index) => index - 1);
    else if (step === 3) {
      setStep(2);
      setRatingIndex(selectedItems.length - 1);
    } else setStep((current) => Math.max(0, current - 1));
  };

  const handleApply = async () => {
    setSaving(true);
    setError(null);
    try {
      await onApply(results.map(({ item }) => item.rankKey));
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to apply ranking');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="md" fullWidth fullScreen={fullScreen}>
      <DialogTitle>
        <Typography variant="h6" component="span" fontWeight={700}>Help me rank my {VIEW_LABELS[view]}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {step === 0 && 'Choose the items you are having trouble ordering.'}
          {step === 1 && 'Tell us what matters most to you.'}
          {step === 2 && `Rate ${currentItem?.title ?? 'each item'} based on your experience.`}
          {step === 3 && 'Review your suggested ranking before applying it.'}
        </Typography>
      </DialogTitle>
      <LinearProgress variant="determinate" value={((step + (step === 2 ? ratingIndex / selectedItems.length : 0)) / 4) * 100} />
      <DialogContent sx={{ minHeight: { sm: 440 }, pt: 3 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {step === 0 && (
          <Stack spacing={1}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="subtitle2">Select 3–6 items</Typography>
              <Chip label={`${selectedKeys.length} selected`} color={selectedKeys.length >= 3 ? 'primary' : 'default'} size="small" />
            </Stack>
            {allItems.map((item) => {
              const checked = selectedKeys.includes(item.rankKey);
              const isRanked = item.rankOrder !== null;
              return (
                <Box key={item.rankKey} sx={{ border: 1, borderColor: checked ? 'primary.main' : 'divider', borderRadius: 1.5, px: 1.5, py: 0.5 }}>
                  <FormControlLabel
                    sx={{ m: 0, width: '100%' }}
                    control={<Checkbox checked={checked} onChange={() => toggleItem(item.rankKey)} disabled={!checked && selectedKeys.length >= 6} />}
                    label={
                      <Box sx={{ py: 0.75 }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="body2" fontWeight={600}>{item.title}</Typography>
                          <Chip label={isRanked ? `#${(item.rankOrder ?? 0) + 1}` : 'Unranked'} size="small" variant="outlined" sx={{ height: 20 }} />
                        </Stack>
                        <Typography variant="caption" color="text.secondary">{item.context}</Typography>
                      </Box>
                    }
                  />
                </Box>
              );
            })}
          </Stack>
        )}

        {step === 1 && (
          <Stack spacing={2.5}>
            {criteria.map((criterion) => (
              <Box key={criterion.id}>
                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1}>
                  <Box>
                    <Typography variant="subtitle2">{criterion.label}</Typography>
                    <Typography variant="caption" color="text.secondary">{criterion.description}</Typography>
                  </Box>
                  <ToggleButtonGroup
                    exclusive
                    size="small"
                    value={weights[criterion.id] ?? 2}
                    onChange={(_, value: number | null) => value && setWeights((current) => ({ ...current, [criterion.id]: value }))}
                    aria-label={`${criterion.label} importance`}
                  >
                    {[1, 2, 3].map((value) => <ToggleButton key={value} value={value}>{IMPORTANCE_LABELS[value]}</ToggleButton>)}
                  </ToggleButtonGroup>
                </Stack>
                <Divider sx={{ mt: 2 }} />
              </Box>
            ))}
          </Stack>
        )}

        {step === 2 && currentItem && (
          <Stack spacing={2.5}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="overline" color="text.secondary">Item {ratingIndex + 1} of {selectedItems.length}</Typography>
                <Typography variant="h6" fontWeight={700}>{currentItem.title}</Typography>
                <Typography variant="body2" color="text.secondary">{currentItem.context}</Typography>
              </Box>
              {currentItem.image && <Box component="img" src={currentItem.image} alt="" sx={{ width: 64, height: 64, borderRadius: 1.5, objectFit: 'cover' }} />}
            </Stack>
            <Divider />
            {criteria.map((criterion) => (
              <Stack key={criterion.id} direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1}>
                <Box>
                  <Typography variant="subtitle2">{criterion.label}</Typography>
                  <Typography variant="caption" color="text.secondary">{criterion.description}</Typography>
                </Box>
                <Rating
                  value={ratings[currentItem.rankKey]?.[criterion.id] ?? 0}
                  onChange={(_, value) => value && setItemRating(currentItem.rankKey, criterion.id, value)}
                  aria-label={`${currentItem.title}: ${criterion.label}`}
                />
              </Stack>
            ))}
          </Stack>
        )}

        {step === 3 && (
          <Stack spacing={1.5}>
            <Alert severity="info">Applying this result will place these items at the top. Your other ranked items will keep their current order below them.</Alert>
            {results.map((result, index) => (
              <Box key={result.item.rankKey} sx={{ display: 'flex', alignItems: 'center', gap: 2, border: 1, borderColor: 'divider', borderRadius: 1.5, p: 1.5 }}>
                <Typography variant="h6" fontWeight={800} color="primary.main" sx={{ width: 28 }}>#{index + 1}</Typography>
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography variant="subtitle2" noWrap>{result.item.title}</Typography>
                  <Typography variant="caption" color="text.secondary">Strongest in {result.strongestCriteria.join(' and ').toLowerCase()}</Typography>
                </Box>
                <Chip label={`${result.score.toFixed(1)} / 5`} size="small" color="primary" variant="outlined" />
              </Box>
            ))}
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Box sx={{ flexGrow: 1 }} />
        {step > 0 && <Button onClick={handleBack} disabled={saving}>Back</Button>}
        {step === 0 && <Button variant="contained" onClick={() => setStep(1)} disabled={selectedKeys.length < 3}>Continue</Button>}
        {step === 1 && <Button variant="contained" onClick={() => setStep(2)}>Start rating</Button>}
        {step === 2 && <Button variant="contained" onClick={handleNextRating} disabled={!currentComplete}>{ratingIndex === selectedItems.length - 1 ? 'Preview ranking' : 'Next item'}</Button>}
        {step === 3 && <Button variant="contained" onClick={handleApply} disabled={saving}>{saving ? 'Applying…' : 'Apply ranking'}</Button>}
      </DialogActions>
    </Dialog>
  );
}
