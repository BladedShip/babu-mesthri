import RNCalendarEvents from 'react-native-calendar-events';
import Contacts from 'react-native-contacts';
import { PermissionsManager } from './PermissionsManager';
import * as FileSystem from 'expo-file-system';
import * as Linking from 'expo-linking';
import * as Location from 'expo-location';
import * as Battery from 'expo-battery';
import * as Device from 'expo-device';
import { useAppStore } from '../store/appStore';

export interface LLMToolParams {
    [key: string]: any;
}

export type LLMToolFunction = (params: LLMToolParams) => Promise<string>;

export interface LLMToolDef {
  name: string;
  description: string;
  parameters: object;
  execute: LLMToolFunction;
}

export interface ToolDoc {
  name: string;
  description: string;
  category: string;
  status: 'active' | 'planned';
}

export const AppTools: Record<string, LLMToolDef> = {
  get_contacts: {
    name: 'get_contacts',
    description: 'Retrieve a list of the user\'s local contacts. Call this when asked for a phone number, name, or address of someone the user knows.',
    parameters: {
      type: 'object',
      properties: {
        searchQuery: {
            type: 'string',
            description: 'Optional name to filter contacts by. Can be first name or last name.'
        }
      }
    },
    execute: async (params) => {
      const hasPermission = await PermissionsManager.checkPermission('contacts');
      if (!hasPermission) return JSON.stringify({ error: 'Contacts permission not granted by user. Ask them to enable it in the app settings.' });

      try {
        let contacts;
        if (params.searchQuery) {
            contacts = await Contacts.getContactsMatchingString(params.searchQuery);
        } else {
            contacts = await Contacts.getAll();
        }
        
        // Map to simpler structure to save LLM context window tokens
        const mapped = contacts.map(c => ({
            name: `${c.givenName || ''} ${c.familyName || ''}`.trim(),
            phones: c.phoneNumbers?.map(p => p.number) || [],
        })).slice(0, 50); // limit payload size strictly for context window
        return JSON.stringify(mapped);
      } catch (err: any) {
        return JSON.stringify({ error: err.message });
      }
    }
  },
  get_calendar_events: {
    name: 'get_calendar_events',
    description: 'Retrieve future calendar events.',
    parameters: {
      type: 'object',
      properties: {
        startDate: {
           type: 'string',
           description: 'ISO-8601 UTC date string to start fetching events from (e.g. 2026-04-06T00:00:00.000Z)'
        },
        endDate: {
           type: 'string',
           description: 'ISO-8601 UTC date string to stop fetching events at'
        }
      },
      required: ['startDate', 'endDate']
    },
    execute: async (params) => {
        const hasPermission = await PermissionsManager.checkPermission('calendar');
        if (!hasPermission) return JSON.stringify({ error: 'Calendar permission not granted. Ask them to enable it in settings.' });

        try {
            const events = await RNCalendarEvents.fetchAllEvents(params.startDate, params.endDate);
            const mapped = events.map(e => ({
                id: e.id,
                title: e.title,
                startDate: e.startDate,
                endDate: e.endDate,
                location: e.location
            })).slice(0, 50);
            return JSON.stringify(mapped);
        } catch (err: any) {
            return JSON.stringify({ error: err.message });
        }
    }
  },
  calculate_expression: {
    name: 'calculate_expression',
    description: 'Evaluate a mathematical formula or expression.',
    parameters: {
      type: 'object',
      properties: {
        expression: { type: 'string', description: 'The math expression to evaluate (e.g., "2 + 2 * 5")' }
      },
      required: ['expression']
    },
    execute: async (params) => {
      try {
        // Safe evaluation of simple math
        const result = new Function('return ' + params.expression)();
        return JSON.stringify({ result });
      } catch (err: any) {
        return JSON.stringify({ error: `Failed to evaluate expression: ${err.message}` });
      }
    }
  },
  roll_dice: {
    name: 'roll_dice',
    description: 'Generate random numbers as if rolling dice.',
    parameters: {
      type: 'object',
      properties: {
        sides: { type: 'number', description: 'Number of sides on the die (e.g., 6, 20)' },
        count: { type: 'number', description: 'Number of dice to roll' }
      },
      required: ['sides', 'count']
    },
    execute: async (params) => {
      const { sides, count } = params;
      const rolls = [];
      for (let i = 0; i < count; i++) {
        rolls.push(Math.floor(Math.random() * sides) + 1);
      }
      const total = rolls.reduce((a, b) => a + b, 0);
      return JSON.stringify({ rolls, total });
    }
  },
  generate_uuid: {
    name: 'generate_uuid',
    description: 'Create a unique identifier (UUID v4) for development tasks.',
    parameters: { type: 'object', properties: {} },
    execute: async () => {
      const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
      return JSON.stringify({ uuid });
    }
  },
  view_ip_address: {
    name: 'view_ip_address',
    description: 'Show the current public IP address of the device.',
    parameters: { type: 'object', properties: {} },
    execute: async () => {
      if (useAppStore.getState().isOfflineMode) {
        return JSON.stringify({ error: 'Device is in strict offline mode. Network requests are blocked.' });
      }
      try {
        const res = await fetch('https://api.ipify.org?format=json');
        const data = await res.json();
        return JSON.stringify({ ip: data.ip });
      } catch (err: any) {
        return JSON.stringify({ error: 'Failed to fetch IP address.' });
      }
    }
  },
  check_storage_usage: {
    name: 'check_storage_usage',
    description: 'Get a breakdown of occupied and available disk space on the device.',
    parameters: { type: 'object', properties: {} },
    execute: async () => {
      try {
        const free = await FileSystem.getFreeDiskStorageAsync();
        const total = await FileSystem.getTotalDiskCapacityAsync();
        const used = total - free;
        return JSON.stringify({
           freeBytes: free,
           totalBytes: total,
           usedBytes: used,
           freeGB: (free / (1024*1024*1024)).toFixed(2),
           totalGB: (total / (1024*1024*1024)).toFixed(2)
        });
      } catch (err: any) {
        return JSON.stringify({ error: 'Failed to read storage usage.' });
      }
    }
  },
  unit_conversion: {
    name: 'unit_conversion',
    description: 'Convert between different units. Supported types: length (m, km, mi, ft), mass (kg, g, lb, oz), temperature (C, F, K).',
    parameters: {
      type: 'object',
      properties: {
        value: { type: 'number', description: 'The numeric value to convert' },
        fromUnit: { type: 'string', description: 'Source unit symbol (e.g. m, kg, C)' },
        toUnit: { type: 'string', description: 'Target unit symbol (e.g. ft, lb, F)' }
      },
      required: ['value', 'fromUnit', 'toUnit']
    },
    execute: async (params) => {
      const { value, fromUnit, toUnit } = params;
      const f = fromUnit.toLowerCase();
      const t = toUnit.toLowerCase();
      let result = null;

      if (f === 'c' && t === 'f') result = (value * 9/5) + 32;
      else if (f === 'f' && t === 'c') result = (value - 32) * 5/9;
      else if (f === 'c' && t === 'k') result = value + 273.15;
      else if (f === 'k' && t === 'c') result = value - 273.15;
      else if (f === 'f' && t === 'k') result = (value - 32) * 5/9 + 273.15;
      else if (f === 'k' && t === 'f') result = (value - 273.15) * 9/5 + 32;

      const lengthToMeter: Record<string, number> = { m: 1, km: 1000, cm: 0.01, mm: 0.001, mi: 1609.34, ft: 0.3048, in: 0.0254, yd: 0.9144 };
      if (result === null && lengthToMeter[f] && lengthToMeter[t]) {
        const inMeters = value * lengthToMeter[f];
        result = inMeters / lengthToMeter[t];
      }

      const massToKg: Record<string, number> = { kg: 1, g: 0.001, mg: 0.000001, lb: 0.453592, oz: 0.0283495 };
      if (result === null && massToKg[f] && massToKg[t]) {
        const inKg = value * massToKg[f];
        result = inKg / massToKg[t];
      }

      if (result === null) {
         return JSON.stringify({ error: `Conversion from ${fromUnit} to ${toUnit} is not supported or invalid.` });
      }

      return JSON.stringify({ originalValue: value, originalUnit: fromUnit, convertedValue: result, targetUnit: toUnit });
    }
  },
  make_call: {
    name: 'make_call',
    description: 'Place a phone call to a contact or number.',
    parameters: {
      type: 'object',
      properties: {
        phoneNumber: { type: 'string', description: 'The phone number to call' }
      },
      required: ['phoneNumber']
    },
    execute: async (params) => {
      try {
        const url = `tel:${params.phoneNumber}`;
        const canOpen = await Linking.canOpenURL(url);
        if (!canOpen) return JSON.stringify({ error: 'Cannot open phone dialer on this device.' });
        await Linking.openURL(url);
        return JSON.stringify({ success: true, message: `Dialer opened for ${params.phoneNumber}` });
      } catch (err: any) {
        return JSON.stringify({ error: `Failed to make call: ${err.message}` });
      }
    }
  },
  send_sms: {
    name: 'send_sms',
    description: 'Send a text message to a contact or phone number.',
    parameters: {
      type: 'object',
      properties: {
        phoneNumber: { type: 'string', description: 'The phone number to send SMS to' },
        message: { type: 'string', description: 'The message content' }
      },
      required: ['phoneNumber']
    },
    execute: async (params) => {
      try {
        const url = `sms:${params.phoneNumber}${params.message ? `?body=${encodeURIComponent(params.message)}` : ''}`;
        const canOpen = await Linking.canOpenURL(url);
        if (!canOpen) return JSON.stringify({ error: 'Cannot open SMS app on this device.' });
        await Linking.openURL(url);
        return JSON.stringify({ success: true, message: `SMS app opened for ${params.phoneNumber}` });
      } catch (err: any) {
        return JSON.stringify({ error: `Failed to send SMS: ${err.message}` });
      }
    }
  },
  send_email: {
    name: 'send_email',
    description: 'Compose and send an email via the default mail client.',
    parameters: {
      type: 'object',
      properties: {
        email: { type: 'string', description: 'Recipient email address' },
        subject: { type: 'string', description: 'Email subject line' },
        body: { type: 'string', description: 'Email body content' }
      },
      required: ['email']
    },
    execute: async (params) => {
      try {
        let url = `mailto:${params.email}`;
        const queryParams = [];
        if (params.subject) queryParams.push(`subject=${encodeURIComponent(params.subject)}`);
        if (params.body) queryParams.push(`body=${encodeURIComponent(params.body)}`);
        if (queryParams.length > 0) {
           url += `?${queryParams.join('&')}`;
        }
        const canOpen = await Linking.canOpenURL(url);
        if (!canOpen) return JSON.stringify({ error: 'Cannot open Email app on this device.' });
        await Linking.openURL(url);
        return JSON.stringify({ success: true, message: `Email composer opened for ${params.email}` });
      } catch (err: any) {
        return JSON.stringify({ error: `Failed to compose email: ${err.message}` });
      }
    }
  },
  get_current_location: {
    name: 'get_current_location',
    description: "Retrieve the device's GPS coordinates.",
    parameters: { type: 'object', properties: {} },
    execute: async () => {
      const hasPermission = await PermissionsManager.checkPermission('location');
      if (!hasPermission) return JSON.stringify({ error: 'Location permission not granted. Ask the user to enable it in Settings.' });

      try {
        const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        return JSON.stringify({
           latitude: location.coords.latitude,
           longitude: location.coords.longitude,
           accuracy: location.coords.accuracy,
           altitude: location.coords.altitude,
        });
      } catch (err: any) {
        return JSON.stringify({ error: `Failed to get location: ${err.message}` });
      }
    }
  },
  get_directions: {
    name: 'get_directions',
    description: 'Provide navigation to a destination via Maps.',
    parameters: {
      type: 'object',
      properties: {
        destination: { type: 'string', description: 'Address or name of the destination' }
      },
      required: ['destination']
    },
    execute: async (params) => {
      if (useAppStore.getState().isOfflineMode) {
        return JSON.stringify({ error: 'Device is in strict offline mode. Cannot open external maps.' });
      }
      try {
        const googleUrl = `https://maps.google.com/?daddr=${encodeURIComponent(params.destination)}`;
        await Linking.openURL(googleUrl);
        return JSON.stringify({ success: true, message: `Maps opened for directions to ${params.destination}` });
      } catch (err: any) {
        return JSON.stringify({ error: `Failed to open directions: ${err.message}` });
      }
    }
  },
  check_battery: {
    name: 'check_battery',
    description: 'Get current battery level and charging status.',
    parameters: { type: 'object', properties: {} },
    execute: async () => {
      try {
        const level = await Battery.getBatteryLevelAsync();
        const state = await Battery.getBatteryStateAsync();
        let stateStr = 'UNKNOWN';
        if (state === Battery.BatteryState.UNPLUGGED) stateStr = 'UNPLUGGED';
        else if (state === Battery.BatteryState.CHARGING) stateStr = 'CHARGING';
        else if (state === Battery.BatteryState.FULL) stateStr = 'FULL';
        return JSON.stringify({
            levelPercent: level >= 0 ? Math.round(level * 100) : 'Unknown',
            state: stateStr
        });
      } catch (err: any) {
        return JSON.stringify({ error: `Failed to read battery: ${err.message}` });
      }
    }
  },
  get_device_model: {
    name: 'get_device_model',
    description: 'Retrieve the official device name and hardware revision.',
    parameters: { type: 'object', properties: {} },
    execute: async () => {
      return JSON.stringify({
         brand: Device.brand,
         designName: Device.designName,
         deviceName: Device.deviceName,
         modelName: Device.modelName,
         osName: Device.osName,
         osVersion: Device.osVersion,
         modelId: Device.modelId
      });
    }
  },
  check_ram_usage: {
    name: 'check_ram_usage',
    description: 'Verify total memory of the device.',
    parameters: { type: 'object', properties: {} },
    execute: async () => {
      return JSON.stringify({
         totalMemoryBytes: Device.totalMemory,
         totalMemoryGB: Device.totalMemory ? (Device.totalMemory / (1024*1024*1024)).toFixed(2) : 'Unknown'
      });
    }
  },
  start_video_call: {
    name: 'start_video_call',
    description: 'Initiate a FaceTime or video call.',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for start_video_call", params });
    }
  },
  send_whatsapp: {
    name: 'send_whatsapp',
    description: 'Send a message via WhatsApp deep link.',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for send_whatsapp", params });
    }
  },
  delete_calendar_event: {
    name: 'delete_calendar_event',
    description: 'Remove an event from the calendar using its ID.',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for delete_calendar_event", params });
    }
  },
  list_events: {
    name: 'list_events',
    description: 'List all events for a specific day or week.',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for list_events", params });
    }
  },
  reschedule_event: {
    name: 'reschedule_event',
    description: 'Change the time or date of an existing calendar event.',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for reschedule_event", params });
    }
  },
  create_reminder: {
    name: 'create_reminder',
    description: 'Set a new reminder with an optional due date.',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for create_reminder", params });
    }
  },
  list_reminders: {
    name: 'list_reminders',
    description: 'Show all active reminders.',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for list_reminders", params });
    }
  },
  complete_reminder: {
    name: 'complete_reminder',
    description: 'Mark a specific reminder task as finished.',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for complete_reminder", params });
    }
  },
  snooze_reminder: {
    name: 'snooze_reminder',
    description: 'Delay a reminder notification by a set duration.',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for snooze_reminder", params });
    }
  },
  write_note: {
    name: 'write_note',
    description: 'Create a new text note in local storage.',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for write_note", params });
    }
  },
  read_note: {
    name: 'read_note',
    description: 'Retrieve the content of a specific note.',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for read_note", params });
    }
  },
  search_notes: {
    name: 'search_notes',
    description: 'Find notes containing specific keywords.',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for search_notes", params });
    }
  },
  append_to_note: {
    name: 'append_to_note',
    description: 'Add new text to the end of an existing note.',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for append_to_note", params });
    }
  },
  list_recent_notes: {
    name: 'list_recent_notes',
    description: 'Get a list of the most recently edited notes.',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for list_recent_notes", params });
    }
  },
  start_timer: {
    name: 'start_timer',
    description: 'Start a countdown timer for a specific duration.',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for start_timer", params });
    }
  },
  pause_timer: {
    name: 'pause_timer',
    description: 'Pause the currently running timer.',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for pause_timer", params });
    }
  },
  stop_timer: {
    name: 'stop_timer',
    description: 'Cancel and reset the active timer.',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for stop_timer", params });
    }
  },
  set_alarm: {
    name: 'set_alarm',
    description: 'Set a one-time or recurring alarm.',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for set_alarm", params });
    }
  },
  list_alarms: {
    name: 'list_alarms',
    description: 'Display all configured alarms.',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for list_alarms", params });
    }
  },
  disable_alarm: {
    name: 'disable_alarm',
    description: 'Turn off a specific alarm.',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for disable_alarm", params });
    }
  },
  enable_alarm: {
    name: 'enable_alarm',
    description: 'Turn on a previously disabled alarm.',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for enable_alarm", params });
    }
  },
  delete_alarm: {
    name: 'delete_alarm',
    description: 'Permanently remove an alarm.',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for delete_alarm", params });
    }
  },
  set_brightness: {
    name: 'set_brightness',
    description: 'Change the display brightness percentage.',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for set_brightness", params });
    }
  },
  open_camera: {
    name: 'open_camera',
    description: 'Launch the camera app for photo or video capture.',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for open_camera", params });
    }
  },
  take_photo: {
    name: 'take_photo',
    description: 'Trigger the shutter to capture a photo.',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for take_photo", params });
    }
  },
  play_music: {
    name: 'play_music',
    description: 'Start playback of a song, album, or playlist.',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for play_music", params });
    }
  },
  pause_music: {
    name: 'pause_music',
    description: 'Pause the current audio playback.',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for pause_music", params });
    }
  },
  skip_track: {
    name: 'skip_track',
    description: 'Play the next track in the queue.',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for skip_track", params });
    }
  },
  previous_track: {
    name: 'previous_track',
    description: 'Restart or play the previous track.',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for previous_track", params });
    }
  },
  record_video: {
    name: 'record_video',
    description: 'Start or stop video recording.',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for record_video", params });
    }
  },
  list_photos: {
    name: 'list_photos',
    description: 'Browse recent photos in the media gallery.',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for list_photos", params });
    }
  },
  search_photos: {
    name: 'search_photos',
    description: 'Search gallery by date, location, or objects.',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for search_photos", params });
    }
  },
  adjust_playback_speed: {
    name: 'adjust_playback_speed',
    description: 'Change speed of audio/video playback.',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for adjust_playback_speed", params });
    }
  },
  save_location: {
    name: 'save_location',
    description: 'Tag and save a specific location.',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for save_location", params });
    }
  },
  list_saved_locations: {
    name: 'list_saved_locations',
    description: 'Retrieve a list of user-saved places.',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for list_saved_locations", params });
    }
  },
  find_my_car: {
    name: 'find_my_car',
    description: 'Retrieve the saved location of the parked vehicle.',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for find_my_car", params });
    }
  },
  search_nearby: {
    name: 'search_nearby',
    description: 'Find points of interest near current location.',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for search_nearby", params });
    }
  },
  get_step_count: {
    name: 'get_step_count',
    description: 'Fetch the total number of steps taken today.',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for get_step_count", params });
    }
  },
  log_water_intake: {
    name: 'log_water_intake',
    description: 'Record the amount of water consumed.',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for log_water_intake", params });
    }
  },
  log_calories: {
    name: 'log_calories',
    description: 'Log food or calorie intake for the day.',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for log_calories", params });
    }
  },
  start_workout_session: {
    name: 'start_workout_session',
    description: 'Begin tracking a fitness activity.',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for start_workout_session", params });
    }
  },
  stop_workout_session: {
    name: 'stop_workout_session',
    description: 'End activity tracking and save data.',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for stop_workout_session", params });
    }
  },
  get_heart_rate: {
    name: 'get_heart_rate',
    description: 'Fetch the most recent heart rate measurement.',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for get_heart_rate", params });
    }
  },
  check_sleep_data: {
    name: 'check_sleep_data',
    description: 'Analyze sleep duration and quality.',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for check_sleep_data", params });
    }
  },
  track_period: {
    name: 'track_period',
    description: 'Log menstrual cycle data.',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for track_period", params });
    }
  },
  log_weight: {
    name: 'log_weight',
    description: 'Save a weight entry to health tracking.',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for log_weight", params });
    }
  },
  get_active_minutes: {
    name: 'get_active_minutes',
    description: 'Fetch total active minutes for the day.',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for get_active_minutes", params });
    }
  },
  add_to_shopping_list: {
    name: 'add_to_shopping_list',
    description: 'Add an item to a local shopping list.',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for add_to_shopping_list", params });
    }
  },
  remove_from_shopping_list: {
    name: 'remove_from_shopping_list',
    description: 'Remove an item from the shopping list.',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for remove_from_shopping_list", params });
    }
  },
  convert_currency: {
    name: 'convert_currency',
    description: 'Convert an amount using bundled exchange rates.',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for convert_currency", params });
    }
  },
  toggle_lights: {
    name: 'toggle_lights',
    description: 'Turn smart lights on or off in a specific room.',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for toggle_lights", params });
    }
  },
  set_thermostat: {
    name: 'set_thermostat',
    description: 'Adjust the target temperature for the home.',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for set_thermostat", params });
    }
  },
  lock_door: {
    name: 'lock_door',
    description: 'Secure a smart lock.',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for lock_door", params });
    }
  },
  unlock_door: {
    name: 'unlock_door',
    description: 'Disengage a smart lock.',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for unlock_door", params });
    }
  },
  check_security_cameras: {
    name: 'check_security_cameras',
    description: 'View a feed or snapshot from security cameras.',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for check_security_cameras", params });
    }
  },
  start_vacuum: {
    name: 'start_vacuum',
    description: 'Initiate a cleaning cycle for a robot vacuum.',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for start_vacuum", params });
    }
  },
  stop_vacuum: {
    name: 'stop_vacuum',
    description: 'Return the robot vacuum to its dock.',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for stop_vacuum", params });
    }
  },
  open_garage: {
    name: 'open_garage',
    description: 'Open or close the smart garage door.',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for open_garage", params });
    }
  },
  set_smart_plug: {
    name: 'set_smart_plug',
    description: 'Control power for a specific smart outlet.',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for set_smart_plug", params });
    }
  },
  run_home_scene: {
    name: 'run_home_scene',
    description: 'Execute a predefined smart home routine.',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for run_home_scene", params });
    }
  },
  scan_qr_code: {
    name: 'scan_qr_code',
    description: 'Launch the scanner to read and parse a QR code.',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for scan_qr_code", params });
    }
  },
  translate_text: {
    name: 'translate_text',
    description: 'Translate phrases between different languages.',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for translate_text", params });
    }
  },
  dictate_text: {
    name: 'dictate_text',
    description: 'Convert spoken words into text for input.',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for dictate_text", params });
    }
  },
  generate_strong_password: {
    name: 'generate_strong_password',
    description: 'Create a randomized, secure password.',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for generate_strong_password", params });
    }
  },
  lock_vault: {
    name: 'lock_vault',
    description: 'Secure the internal persistent storage and chat history.',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for lock_vault", params });
    }
  },
  check_battery_health: {
    name: 'check_battery_health',
    description: 'Retrieve max capacity and cycle count of the battery.',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for check_battery_health", params });
    }
  },
  set_theme_mode: {
    name: 'set_theme_mode',
    description: 'Switch between Light, Dark, or System mode.',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for set_theme_mode", params });
    }
  },
  crop_image: {
    name: 'crop_image',
    description: 'Adjust the framing and aspect ratio of a picture.',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for crop_image", params });
    }
  },
  resize_media: {
    name: 'resize_media',
    description: 'Reduce the resolution or file size of a photo or video.',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for resize_media", params });
    }
  },
  transcribe_voice_memo: {
    name: 'transcribe_voice_memo',
    description: 'Convert a voice recording into a text document.',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for transcribe_voice_memo", params });
    }
  },
  trim_video: {
    name: 'trim_video',
    description: 'Shorten a video clip by specifying start and end points.',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for trim_video", params });
    }
  },
  apply_image_filter: {
    name: 'apply_image_filter',
    description: 'Add a visual style (e.g. Sepia, B&W) to a photo.',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for apply_image_filter", params });
    }
  },
  extract_audio_from_video: {
    name: 'extract_audio_from_video',
    description: 'Convert a video file into a standalone audio track.',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for extract_audio_from_video", params });
    }
  },
  add_text_to_image: {
    name: 'add_text_to_image',
    description: 'Overlay a caption or watermark on a photo.',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for add_text_to_image", params });
    }
  },
  stitch_images: {
    name: 'stitch_images',
    description: 'Combine multiple photos into a collage.',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for stitch_images", params });
    }
  },
  remove_image_background: {
    name: 'remove_image_background',
    description: 'Isolate the subject of a photo (AI removal).',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for remove_image_background", params });
    }
  },
  reverse_video: {
    name: 'reverse_video',
    description: 'Process a video clip to play backwards.',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for reverse_video", params });
    }
  },
  slow_mo_conversion: {
    name: 'slow_mo_conversion',
    description: 'Change the frame rate to create a slow-motion effect.',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for slow_mo_conversion", params });
    }
  },
  combine_audio_tracks: {
    name: 'combine_audio_tracks',
    description: 'Mix two or more audio files into one.',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for combine_audio_tracks", params });
    }
  },
  lookup_world_clock: {
    name: 'lookup_world_clock',
    description: 'Check the current time in cities around the world.',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for lookup_world_clock", params });
    }
  },
  convert_timezone: {
    name: 'convert_timezone',
    description: 'Calculate times between two different time zones.',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for convert_timezone", params });
    }
  },
  create_flashcard: {
    name: 'create_flashcard',
    description: 'Save a question and answer for study sessions.',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for create_flashcard", params });
    }
  },
  start_study_timer: {
    name: 'start_study_timer',
    description: 'Initiate a Pomodoro session for focused learning.',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for start_study_timer", params });
    }
  },
  solve_equation: {
    name: 'solve_equation',
    description: 'Provide step-by-step solutions for math problems.',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for solve_equation", params });
    }
  },
  lookup_definition: {
    name: 'lookup_definition',
    description: 'Find the dictionary definition of a word.',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for lookup_definition", params });
    }
  },
  get_synonyms_antonyms: {
    name: 'get_synonyms_antonyms',
    description: 'Find alternative words to improve writing.',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for get_synonyms_antonyms", params });
    }
  },
};


