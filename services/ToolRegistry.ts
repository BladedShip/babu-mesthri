import RNCalendarEvents from 'react-native-calendar-events';
import Contacts from 'react-native-contacts';
import { PermissionsManager } from './PermissionsManager';

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
  }
};
