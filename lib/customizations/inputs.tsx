import * as React from 'react';
import { alpha, type Theme, type Components } from '@mui/material/styles';
import { outlinedInputClasses } from '@mui/material/OutlinedInput';
import { svgIconClasses } from '@mui/material/SvgIcon';
import { toggleButtonGroupClasses } from '@mui/material/ToggleButtonGroup';
import { toggleButtonClasses } from '@mui/material/ToggleButton';
import {
  CheckBoxOutlineBlankRoundedIcon,
  CheckRoundedIcon,
  RemoveRoundedIcon,
} from '@/components/Icons';
import { gray, brand } from '../colors';

export const inputsCustomizations: Components<Theme> = {
  MuiButtonBase: {
    defaultProps: {
      disableTouchRipple: true,
      disableRipple: true,
    },
    styleOverrides: {
      root: ({ theme }) => ({
        boxSizing: 'border-box',
        transition: 'all 100ms ease-in',
        '&:active': {
          transform: 'scale(0.95)',
        },
        '&:focus-visible': {
          outline: `2px solid ${brand[500]}`,
          outlineOffset: '2px',
        },
      }),
    },
  },
  MuiButton: {
    styleOverrides: {
      root: ({ theme }) => ({
        boxShadow: 'none',
        borderRadius: '9999px',
        textTransform: 'none',
        padding: '11px 22px',
        variants: [
          {
            props: { size: 'small' },
            style: { height: '2.25rem', padding: '8px 16px' },
          },
          {
            props: { size: 'medium' },
            style: { height: '2.75rem' },
          },
          {
            props: { color: 'primary', variant: 'contained' },
            style: {
              color: 'white',
              backgroundColor: brand[400],
              borderRadius: '9999px',
              '&:hover': { backgroundColor: brand[500] },
              '&:active': { backgroundColor: brand[400], transform: 'scale(0.95)' },
              '&.Mui-disabled': {
                color: 'white',
                backgroundColor: brand[100],
              },
              ...theme.applyStyles('dark', {
                color: 'white',
                backgroundColor: brand[400],
                '&:hover': { backgroundColor: brand[500] },
                '&:active': { backgroundColor: brand[400], transform: 'scale(0.95)' },
                '&.Mui-disabled': {
                  color: gray[600],
                  backgroundColor: brand[900],
                },
              }),
            },
          },
          {
            props: { color: 'secondary', variant: 'contained' },
            style: {
              color: brand[400],
              backgroundColor: 'transparent',
              border: `1px solid ${brand[400]}`,
              borderRadius: '9999px',
              '&:hover': { backgroundColor: alpha(brand[400], 0.05) },
              '&:active': { transform: 'scale(0.95)' },
              '&.Mui-disabled': {
                color: gray[400],
                backgroundColor: 'transparent',
                borderColor: gray[300],
              },
              ...theme.applyStyles('dark', {
                color: brand[300],
                backgroundColor: 'transparent',
                border: `1px solid ${brand[300]}`,
                '&:hover': { backgroundColor: alpha(brand[300], 0.05) },
                '&:active': { transform: 'scale(0.95)' },
                '&.Mui-disabled': {
                  color: gray[600],
                  backgroundColor: 'transparent',
                  borderColor: gray[700],
                },
              }),
            },
          },
          {
            props: { variant: 'outlined' },
            style: {
              color: (theme.vars || theme).palette.text.primary,
              border: '1px solid',
              borderColor: gray[200],
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              padding: '8px 15px',
              '&:hover': { backgroundColor: gray[50], borderColor: gray[300] },
              '&:active': { backgroundColor: gray[100], transform: 'scale(0.95)' },
              '&.Mui-disabled': {
                color: gray[400],
                backgroundColor: '#ffffff',
                borderColor: gray[200],
              },
              ...theme.applyStyles('dark', {
                backgroundColor: gray[800],
                borderColor: gray[700],
                '&:hover': { backgroundColor: gray[700], borderColor: gray[600] },
                '&:active': { backgroundColor: gray[700], transform: 'scale(0.95)' },
                '&.Mui-disabled': {
                  color: gray[500],
                  backgroundColor: gray[800],
                  borderColor: gray[700],
                },
              }),
            },
          },
          {
            props: { color: 'secondary', variant: 'outlined' },
            style: {
              color: brand[400],
              border: '1px solid',
              borderColor: alpha(brand[400], 0.3),
              backgroundColor: '#ffffff',
              borderRadius: '9999px',
              '&:hover': { backgroundColor: alpha(brand[400], 0.05), borderColor: brand[400] },
              '&:active': { transform: 'scale(0.95)' },
              '&.Mui-disabled': {
                color: gray[400],
                backgroundColor: '#ffffff',
                borderColor: gray[300],
              },
              ...theme.applyStyles('dark', {
                color: brand[300],
                border: '1px solid',
                borderColor: alpha(brand[300], 0.3),
                backgroundColor: 'transparent',
                '&:hover': { backgroundColor: alpha(brand[300], 0.05), borderColor: brand[300] },
                '&:active': { transform: 'scale(0.95)' },
                '&.Mui-disabled': {
                  color: gray[600],
                  backgroundColor: 'transparent',
                  borderColor: gray[700],
                },
              }),
            },
          },
          {
            props: { variant: 'text' },
            style: {
              color: brand[400],
              '&:hover': { backgroundColor: alpha(brand[400], 0.05) },
              '&:active': { transform: 'scale(0.95)' },
              '&.Mui-disabled': { color: gray[400] },
              ...theme.applyStyles('dark', {
                color: brand[300],
                '&:hover': { backgroundColor: alpha(brand[300], 0.05) },
                '&:active': { transform: 'scale(0.95)' },
                '&.Mui-disabled': { color: gray[600] },
              }),
            },
          },
          {
            props: { color: 'secondary', variant: 'text' },
            style: {
              color: (theme.vars || theme).palette.text.primary,
              '&:hover': { backgroundColor: gray[100] },
              '&:active': { transform: 'scale(0.95)' },
              '&.Mui-disabled': { color: gray[400] },
              ...theme.applyStyles('dark', {
                color: gray[50],
                '&:hover': { backgroundColor: gray[700] },
                '&:active': { transform: 'scale(0.95)' },
                '&.Mui-disabled': { color: gray[600] },
              }),
            },
          },
        ],
      }),
    },
  },
  MuiIconButton: {
    styleOverrides: {
      root: ({ theme }) => ({
        boxShadow: 'none',
        borderRadius: '999px',
        textTransform: 'none',
        fontWeight: theme.typography.fontWeightMedium,
        letterSpacing: 0,
        color: (theme.vars || theme).palette.text.primary,
        border: 'none',
        backgroundColor: alpha(gray[300], 0.64),
        '&:hover': { backgroundColor: alpha(gray[300], 0.8) },
        '&:active': { transform: 'scale(0.95)' },
        ...theme.applyStyles('dark', {
          backgroundColor: alpha(gray[700], 0.64),
          color: '#fff',
          '&:hover': { backgroundColor: alpha(gray[700], 0.8) },
        }),
        variants: [
          {
            props: { size: 'small' },
            style: {
              width: '2rem',
              height: '2rem',
              padding: '0.25rem',
              [`& .${svgIconClasses.root}`]: { fontSize: '1rem' },
            },
          },
          {
            props: { size: 'medium' },
            style: { width: '2.25rem', height: '2.25rem' },
          },
        ],
      }),
    },
  },
  MuiToggleButtonGroup: {
    styleOverrides: {
      root: ({ theme }) => ({
        borderRadius: '8px',
        boxShadow: 'none',
        [`& .${toggleButtonGroupClasses.selected}`]: { color: brand[500] },
        ...theme.applyStyles('dark', {
          [`& .${toggleButtonGroupClasses.selected}`]: { color: '#fff' },
        }),
      }),
    },
  },
  MuiToggleButton: {
    styleOverrides: {
      root: ({ theme }) => ({
        padding: '12px 16px',
        textTransform: 'none',
        borderRadius: '8px',
        fontWeight: 500,
        ...theme.applyStyles('dark', {
          color: gray[400],
          [`&.${toggleButtonClasses.selected}`]: { color: brand[300] },
        }),
      }),
    },
  },
  MuiCheckbox: {
    defaultProps: {
      disableRipple: true,
      icon: <CheckBoxOutlineBlankRoundedIcon sx={{ color: 'rgba(0, 0, 0, 0.0)' }} />,
      checkedIcon: <CheckRoundedIcon sx={{ height: 14, width: 14 }} />,
      indeterminateIcon: <RemoveRoundedIcon sx={{ height: 14, width: 14 }} />,
    },
    styleOverrides: {
      root: ({ theme }) => ({
        margin: 10,
        height: 16,
        width: 16,
        borderRadius: 4,
        border: '1px solid',
        borderColor: gray[400],
        backgroundColor: '#ffffff',
        transition: 'border-color, background-color, 120ms ease-in',
        '&:hover': { borderColor: brand[400] },
        '&.Mui-focusVisible': {
          outline: `2px solid ${brand[500]}`,
          outlineOffset: '2px',
          borderColor: brand[400],
        },
        '&.Mui-checked': {
          color: 'white',
          backgroundColor: brand[400],
          borderColor: brand[400],
          '&:hover': { backgroundColor: brand[500] },
        },
        ...theme.applyStyles('dark', {
          borderColor: gray[600],
          backgroundColor: 'transparent',
          '&:hover': { borderColor: brand[300] },
          '&.Mui-focusVisible': {
            borderColor: brand[400],
            outline: `2px solid ${brand[500]}`,
            outlineOffset: '2px',
          },
        }),
      }),
    },
  },
  MuiInputBase: {
    styleOverrides: {
      root: { border: 'none' },
      input: {
        '&::placeholder': { opacity: 0.7, color: gray[500] },
      },
    },
  },
  MuiOutlinedInput: {
    styleOverrides: {
      input: { padding: 0 },
      root: ({ theme }) => ({
        padding: '12px 20px',
        color: (theme.vars || theme).palette.text.primary,
        borderRadius: '9999px',
        border: `1px solid ${alpha(gray[800], 0.08)}`,
        backgroundColor: '#ffffff',
        transition: 'border 120ms ease-in',
        '&:hover': { borderColor: gray[400] },
        [`&.${outlinedInputClasses.focused}`]: {
          borderColor: brand[400],
          outline: `2px solid ${brand[500]}`,
        },
        ...theme.applyStyles('dark', {
          backgroundColor: gray[800],
          border: `1px solid ${alpha(gray[700], 0.6)}`,
          '&:hover': { borderColor: gray[500] },
        }),
        variants: [
          { props: { size: 'small' }, style: { height: '2.5rem' } },
          { props: { size: 'medium' }, style: { height: '2.75rem' } },
        ],
      }),
      notchedOutline: { border: 'none' },
    },
  },
  MuiInputAdornment: {
    styleOverrides: {
      root: ({ theme }) => ({
        color: (theme.vars || theme).palette.grey[500],
        ...theme.applyStyles('dark', {
          color: (theme.vars || theme).palette.grey[400],
        }),
      }),
    },
  },
  MuiInputLabel: {
    styleOverrides: {
      root: {
        '&.MuiInputLabel-outlined': {
          transform: 'translate(20px, 12px) scale(1)',
          '&.MuiInputLabel-shrink': {
            transform: 'translate(20px, -9px) scale(0.75)',
          },
        },
      },
    },
  },
  MuiFormLabel: {
    styleOverrides: {
      root: ({ theme }) => ({
        typography: theme.typography.caption,
        marginBottom: 8,
      }),
    },
  },
};
