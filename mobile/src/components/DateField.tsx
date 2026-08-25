import { useState } from 'react';
import { Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { TextInput } from 'react-native-paper';
import dayjs from 'dayjs';

export function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (isoDate: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  const dateValue = value ? new Date(value) : new Date();

  return (
    <>
      <TextInput
        mode="outlined"
        label={label}
        value={value ? dayjs(value).format('MMM D, YYYY') : ''}
        editable={false}
        onPressIn={() => setVisible(true)}
        right={<TextInput.Icon icon="calendar" onPress={() => setVisible(true)} />}
        style={{ marginBottom: 12 }}
      />
      {visible ? (
        <DateTimePicker
          value={dateValue}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={(event, selected) => {
            if (Platform.OS === 'android') setVisible(false);
            if (event.type === 'set' && selected) {
              onChange(dayjs(selected).format('YYYY-MM-DD'));
            }
          }}
        />
      ) : null}
    </>
  );
}
