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

export interface ToolDoc {
  name: string;
  description: string;
  category: string;
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

/**
 * POTENTIAL_TOOL_DOCS
 * This is a collection of ~100 categorized tools that represent the full vision
 * of a mobile AI assistant. These are currently for documentation and AI discovery
 * purposes, outlining capabilities to be implemented or orchestrated via external APIs.
 */
export const POTENTIAL_TOOL_DOCS: ToolDoc[] = [
  // --- COMMUNICATION ---
  { name: 'make_call', description: 'Place a phone call to a contact or a specific number.', category: 'Communication' },
  { name: 'send_sms', description: 'Send a text message to a contact or phone number.', category: 'Communication' },
  { name: 'read_sms', description: 'Read the most recent incoming text messages.', category: 'Communication' },
  { name: 'reply_sms', description: 'Reply to the last received message.', category: 'Communication' },
  { name: 'send_email', description: 'Compose and send an email via the default mail client.', category: 'Communication' },
  { name: 'read_email', description: 'Fetch unread emails from the inbox.', category: 'Communication' },
  { name: 'search_emails', description: 'Search for emails by sender, subject, or content keywords.', category: 'Communication' },
  { name: 'start_video_call', description: 'Initiate a FaceTime or video call.', category: 'Communication' },
  { name: 'send_whatsapp', description: 'Send a message via WhatsApp (requires Third-Party API).', category: 'Communication' },
  { name: 'list_missed_calls', description: 'Retrieve a list of recent missed calls.', category: 'Communication' },
  { name: 'check_voicemail', description: 'Access and list voice mail messages.', category: 'Communication' },
  { name: 'manage_contacts', description: 'Update or delete an existing contact\'s information.', category: 'Communication' },

  // --- PRODUCTIVITY & CALENDAR ---
  { name: 'add_calendar_event', description: 'Create a new appointment in the user\'s calendar.', category: 'Productivity' },
  { name: 'delete_calendar_event', description: 'Remove an event from the calendar using its ID.', category: 'Productivity' },
  { name: 'list_events', description: 'List all events for a specific day or week.', category: 'Productivity' },
  { name: 'reschedule_event', description: 'Change the time or date of an existing calendar event.', category: 'Productivity' },
  { name: 'check_availability', description: 'Find free slots in the user\'s schedule for a given timeframe.', category: 'Productivity' },
  { name: 'create_reminder', description: 'Set a new reminder with an optional due date.', category: 'Productivity' },
  { name: 'list_reminders', description: 'Show all active reminders.', category: 'Productivity' },
  { name: 'complete_reminder', description: 'Mark a specific reminder task as finished.', category: 'Productivity' },
  { name: 'snooze_reminder', description: 'Delay a reminder notification by a set duration.', category: 'Productivity' },
  { name: 'write_note', description: 'Create a new text note in the system notes app.', category: 'Productivity' },
  { name: 'read_note', description: 'Retrieve the content of a specific note.', category: 'Productivity' },
  { name: 'search_notes', description: 'Find notes containing specific keywords.', category: 'Productivity' },
  { name: 'append_to_note', description: 'Add new text to the end of an existing note.', category: 'Productivity' },
  { name: 'list_recent_notes', description: 'Get a list of the most recently edited notes.', category: 'Productivity' },

  // --- ALARMS & TIMERS ---
  { name: 'set_alarm', description: 'Set a one-time or recurring alarm for a specific time.', category: 'Time Management' },
  { name: 'list_alarms', description: 'Display all configured alarms.', category: 'Time Management' },
  { name: 'disable_alarm', description: 'Turn off a specific alarm.', category: 'Time Management' },
  { name: 'enable_alarm', description: 'Turn on a previously disabled alarm.', category: 'Time Management' },
  { name: 'delete_alarm', description: 'Permanently remove an alarm.', category: 'Time Management' },
  { name: 'start_timer', description: 'Start a countdown timer for a specific duration.', category: 'Time Management' },
  { name: 'pause_timer', description: 'Pause the currently running timer.', category: 'Time Management' },
  { name: 'stop_timer', description: 'Cancel and reset the active timer.', category: 'Time Management' },

  // --- SYSTEM CONTROLS ---
  { name: 'set_volume', description: 'Adjust the system speaker or ringer volume level.', category: 'System' },
  { name: 'set_brightness', description: 'Change the display brightness percentage.', category: 'System' },
  { name: 'toggle_wifi', description: 'Enable or disable the Wi-Fi radio.', category: 'System' },
  { name: 'toggle_bluetooth', description: 'Enable or disable Bluetooth connectivity.', category: 'System' },
  { name: 'toggle_dnd', description: 'Turn on or off Do Not Disturb mode.', category: 'System' },
  { name: 'check_battery', description: 'Get current battery level and charging status.', category: 'System' },
  { name: 'toggle_flashlight', description: 'Turn the device\'s rear flash on or off.', category: 'System' },
  { name: 'restart_device', description: 'Initiate a system reboot.', category: 'System' },
  { name: 'lock_device', description: 'Immediately lock the screen.', category: 'System' },
  { name: 'take_screenshot', description: 'Capture the current screen and save to gallery.', category: 'System' },
  { name: 'set_wallpaper', description: 'Update the home or lock screen wallpaper.', category: 'System' },
  { name: 'toggle_airplane_mode', description: 'Switch Airplane Mode on or off.', category: 'System' },

  // --- MEDIA & ENTERTAINMENT ---
  { name: 'play_music', description: 'Start playback of a song, album, or playlist.', category: 'Media' },
  { name: 'pause_music', description: 'Pause the current audio playback.', category: 'Media' },
  { name: 'skip_track', description: 'Play the next track in the queue.', category: 'Media' },
  { name: 'previous_track', description: 'Restart the current track or play the previous one.', category: 'Media' },
  { name: 'search_music', description: 'Search for music in the user\'s library or streaming service.', category: 'Media' },
  { name: 'adjust_playback_speed', description: 'Change the speed of audio/video playback.', category: 'Media' },
  { name: 'open_camera', description: 'Launch the camera app for photo or video capture.', category: 'Media' },
  { name: 'take_photo', description: 'Trigger the shutter to capture a photo remotely.', category: 'Media' },
  { name: 'record_video', description: 'Start or stop video recording.', category: 'Media' },
  { name: 'list_photos', description: 'Browse recent photos in the media gallery.', category: 'Media' },
  { name: 'search_photos', description: 'Search gallery for photos by date, location, or objects.', category: 'Media' },
  { name: 'set_media_volume', description: 'Adjust volume specifically for media playback.', category: 'Media' },

  // --- NAVIGATION & LOCATION ---
  { name: 'get_directions', description: 'Provide turn-by-turn navigation to a destination.', category: 'Navigation' },
  { name: 'search_nearby', description: 'Find points of interest near current location.', category: 'Navigation' },
  { name: 'check_traffic', description: 'Show current traffic conditions on a specified route.', category: 'Navigation' },
  { name: 'get_current_location', description: 'Retrieve the device\'s GPS coordinates and address.', category: 'Navigation' },
  { name: 'save_location', description: 'Tag and save the current or a specific location.', category: 'Navigation' },
  { name: 'list_saved_locations', description: 'Retrieve a list of user-saved places.', category: 'Navigation' },
  { name: 'check_transit_schedule', description: 'Get bus, train, or subway departure times.', category: 'Navigation' },
  { name: 'book_ride', description: 'Request a ride via Uber or Lyft.', category: 'Navigation' },
  { name: 'track_delivery', description: 'Check the status of a package or food delivery.', category: 'Navigation' },
  { name: 'find_my_car', description: 'Retrieve the saved location of the parked vehicle.', category: 'Navigation' },

  // --- HEALTH & FITNESS ---
  { name: 'get_step_count', description: 'Fetch the total number of steps taken today.', category: 'Health' },
  { name: 'log_water_intake', description: 'Record the amount of water consumed.', category: 'Health' },
  { name: 'log_calories', description: 'Log food or calorie intake for the day.', category: 'Health' },
  { name: 'start_workout_session', description: 'Begin tracking a fitness activity.', category: 'Health' },
  { name: 'stop_workout_session', description: 'End the current activity tracking and save data.', category: 'Health' },
  { name: 'get_heart_rate', description: 'Fetch the most recent heart rate measurement.', category: 'Health' },
  { name: 'check_sleep_data', description: 'Analyze sleep duration and quality from last night.', category: 'Health' },
  { name: 'track_period', description: 'Log menstrual cycle data.', category: 'Health' },
  { name: 'log_weight', description: 'Save a weight entry to health tracking.', category: 'Health' },
  { name: 'get_active_minutes', description: 'Fetch total active or exercise minutes for the day.', category: 'Health' },

  // --- FINANCIAL UTILITIES ---
  { name: 'check_balance', description: 'Check account balance in a bank or payment app.', category: 'Finance' },
  { name: 'send_money', description: 'Initiate a peer-to-peer payment via Venmo or CashApp.', category: 'Finance' },
  { name: 'request_money', description: 'Request a payment from another user.', category: 'Finance' },
  { name: 'view_transactions', description: 'List recent financial transactions.', category: 'Finance' },
  { name: 'add_to_shopping_list', description: 'Add an item to a global shopping list.', category: 'Finance' },
  { name: 'remove_from_shopping_list', description: 'Remove an item from the shopping list.', category: 'Finance' },
  { name: 'check_price', description: 'Scan a barcode or search to check the price of an item.', category: 'Finance' },
  { name: 'convert_currency', description: 'Convert an amount using live exchange rates.', category: 'Finance' },

  // --- WEATHER & ENVIRONMENT ---
  { name: 'get_weather_forecast', description: 'Fetch weather data for today and coming days.', category: 'Environment' },
  { name: 'check_air_quality', description: 'Check the AQI for the current location.', category: 'Environment' },
  { name: 'get_sunrise_sunset', description: 'Check sunrise and sunset times.', category: 'Environment' },
  { name: 'check_uv_index', description: 'Check the current UV radiation levels.', category: 'Environment' },
  { name: 'check_wind_speed', description: 'Fetch current wind speed and direction.', category: 'Environment' },
  { name: 'get_humidity', description: 'Check the current humidity percentage.', category: 'Environment' },

  // --- HOME AUTOMATION (IoT) ---
  { name: 'toggle_lights', description: 'Turn smart lights on or off in a specific room.', category: 'Home' },
  { name: 'set_thermostat', description: 'Adjust the target temperature for the home.', category: 'Home' },
  { name: 'lock_door', description: 'Secure a smart lock.', category: 'Home' },
  { name: 'unlock_door', description: 'Disengage a smart lock.', category: 'Home' },
  { name: 'check_security_cameras', description: 'View a feed or snapshot from security cameras.', category: 'Home' },
  { name: 'start_vacuum', description: 'Initiate a cleaning cycle for a robot vacuum.', category: 'Home' },
  { name: 'stop_vacuum', description: 'Return the robot vacuum to its dock.', category: 'Home' },
  { name: 'open_garage', description: 'Open or close the smart garage door.', category: 'Home' },
  { name: 'set_smart_plug', description: 'Control power for a specific smart outlet.', category: 'Home' },
  { name: 'run_home_scene', description: 'Execute a predefined smart home routine.', category: 'Home' },

  // --- GENERAL UTILITIES ---
  { name: 'calculate_expression', description: 'Evaluate a mathematical formula or expression.', category: 'Utilities' },
  { name: 'unit_conversion', description: 'Convert between different units (e.g. miles to km).', category: 'Utilities' },
  { name: 'translate_text', description: 'Translate phrases between different languages.', category: 'Utilities' },
  { name: 'search_web', description: 'Perform a web search for information.', category: 'Utilities' },
  { name: 'dictate_text', description: 'Convert spoken words into text for input.', category: 'Utilities' },
  { name: 'scan_qr_code', description: 'Launch the scanner to read and parse a QR code.', category: 'Utilities' },
  { name: 'identify_song', description: 'Listen to and identify a song playing nearby.', category: 'Utilities' },
  { name: 'check_news', description: 'Fetch the latest news headlines.', category: 'Utilities' },
  { name: 'read_horoscope', description: 'Retrieve the daily horoscope for a zodiac sign.', category: 'Utilities' },
  { name: 'roll_dice', description: 'Generate a random number as if rolling dice.', category: 'Utilities' },

  // --- ACCESSIBILITY ---
  { name: 'toggle_voiceover', description: 'Enable or disable screen reader capabilities.', category: 'Accessibility' },
  { name: 'toggle_magnifier', description: 'Launch or close the screen magnifying lens tool.', category: 'Accessibility' },
  { name: 'set_text_size', description: 'Adjust the system-wide font size for better readability.', category: 'Accessibility' },
  { name: 'toggle_high_contrast', description: 'Enable or disable high contrast visual modes.', category: 'Accessibility' },
  { name: 'enable_color_filters', description: 'Apply color filters to assist with color blindness.', category: 'Accessibility' },
  { name: 'start_guided_access', description: 'Lock the device to a single app for focused usage.', category: 'Accessibility' },
  { name: 'activate_assistive_touch', description: 'Show or hide the on-screen assistant menu.', category: 'Accessibility' },
  { name: 'toggle_mono_audio', description: 'Force audio output to mono for hearing assistance.', category: 'Accessibility' },
  { name: 'list_accessibility_shortcuts', description: 'Show all configured accessibility quick-access features.', category: 'Accessibility' },
  { name: 'set_display_zoom', description: 'Adjust the device\'s UI scale for a zoomed-in display.', category: 'Accessibility' },

  // --- APP & STORAGE MANAGEMENT ---
  { name: 'list_installed_apps', description: 'Retrieve a list of all user-installed applications.', category: 'App Management' },
  { name: 'search_app_store', description: 'Search the official App Store for new applications.', category: 'App Management' },
  { name: 'check_storage_usage', description: 'Get a breakdown of occupied and available disk space.', category: 'App Management' },
  { name: 'find_large_files', description: 'Identify files taking up significant storage.', category: 'App Management' },
  { name: 'clear_app_cache', description: 'Wipe temporary cache data for a specific application.', category: 'App Management' },
  { name: 'uninstall_app', description: 'Remove an application and its associated data.', category: 'App Management' },
  { name: 'offload_unused_apps', description: 'Free up space by removing unused app bundles.', category: 'App Management' },
  { name: 'check_app_updates', description: 'Check if any installed apps have pending updates.', category: 'App Management' },
  { name: 'get_app_permissions', description: 'List all system permissions granted to a specific app.', category: 'App Management' },
  { name: 'manage_icloud_storage', description: 'View and manage user data stored in the cloud backup.', category: 'App Management' },

  // --- SECURITY & PRIVACY ---
  { name: 'check_security_status', description: 'Verify if OS is up-to-date and biometric locks are active.', category: 'Security' },
  { name: 'enable_vpn', description: 'Connect to the configured Virtual Private Network.', category: 'Security' },
  { name: 'disable_vpn', description: 'Disconnect and terminate the active VPN session.', category: 'Security' },
  { name: 'list_vpn_profiles', description: 'Show all stored VPN configuration profiles.', category: 'Security' },
  { name: 'find_my_device_status', description: 'Check if remote tracking and wipe features are enabled.', category: 'Security' },
  { name: 'clear_browser_history', description: 'Wipe recent browsing history and cookies.', category: 'Security' },
  { name: 'manage_passwords', description: 'Access the secure system password manager.', category: 'Security' },
  { name: 'toggle_location_services', description: 'Turn global GPS and location tracking on or off.', category: 'Security' },
  { name: 'generate_strong_password', description: 'Create a randomized, secure password.', category: 'Security' },
  { name: 'lock_vault', description: 'Secure the internal persistent storage and chat history.', category: 'Security' },

  // --- HARDWARE & DIAGNOSTICS ---
  { name: 'check_cpu_load', description: 'Get the real-time processor utilization percentage.', category: 'Diagnostics' },
  { name: 'check_ram_usage', description: 'Verify current memory pressure and free RAM.', category: 'Diagnostics' },
  { name: 'get_device_model', description: 'Retrieve the official device name and hardware revision.', category: 'Diagnostics' },
  { name: 'check_sensor_status', description: 'Verify if accelerometer, gyroscope, and compass are functional.', category: 'Diagnostics' },
  { name: 'test_microphone', description: 'Perform a quick audio capture to verify mic functionality.', category: 'Diagnostics' },
  { name: 'test_speakers', description: 'Play a diagnostic tone to check speaker balance.', category: 'Diagnostics' },
  { name: 'check_battery_health', description: 'Retrieve the maximum capacity and cycle count of the battery.', category: 'Diagnostics' },
  { name: 'get_network_speed', description: 'Perform a ping and download speed test.', category: 'Diagnostics' },
  { name: 'list_hardware_ids', description: 'Show serial numbers and IMEI/MEID information.', category: 'Diagnostics' },
  { name: 'check_thermal_state', description: 'Verify if the device is running hot or throttled.', category: 'Diagnostics' },

  // --- CONNECTIVITY & NETWORKING ---
  { name: 'list_wifi_networks', description: 'Scan for available Wi-Fi access points.', category: 'Connectivity' },
  { name: 'join_wifi_network', description: 'Connect to a specific Wi-Fi SSID with credentials.', category: 'Connectivity' },
  { name: 'share_wifi_qr', description: 'Generate a QR code to allow others to join current network.', category: 'Connectivity' },
  { name: 'toggle_personal_hotspot', description: 'Enable or disable sharing cellular data via Wi-Fi.', category: 'Connectivity' },
  { name: 'list_paired_bluetooth', description: 'Show all devices currently bonded via Bluetooth.', category: 'Connectivity' },
  { name: 'forget_bluetooth_device', description: 'Remove a device from the paired Bluetooth list.', category: 'Connectivity' },
  { name: 'check_cell_signal', description: 'Get the current cellular signal strength.', category: 'Connectivity' },
  { name: 'toggle_data_roaming', description: 'Turn on or off data usage while on roaming networks.', category: 'Connectivity' },
  { name: 'set_data_limit', description: 'Configure a monthly data usage cap with alerts.', category: 'Connectivity' },
  { name: 'view_ip_address', description: 'Show the current local and public IP addresses.', category: 'Connectivity' },

  // --- PERSONALIZATION & THEMES ---
  { name: 'set_theme_mode', description: 'Switch between Light, Dark, or System mode.', category: 'Personalization' },
  { name: 'change_icon_pack', description: 'Switch the appearance of application icons.', category: 'Personalization' },
  { name: 'customize_control_center', description: 'Add or remove toggles from the quick settings menu.', category: 'Personalization' },
  { name: 'manage_widgets', description: 'Add, remove, or configure home screen widgets.', category: 'Personalization' },
  { name: 'set_focus_schedule', description: 'Configure automatic activation times for focus modes.', category: 'Personalization' },
  { name: 'change_notification_sound', description: 'Set the default sound for incoming alerts.', category: 'Personalization' },
  { name: 'toggle_haptic_feedback', description: 'Turn on or off system-wide vibration effects.', category: 'Personalization' },
  { name: 'set_auto_lock_time', description: 'Adjust the idle timeout before the screen turns off.', category: 'Personalization' },
  { name: 'create_custom_shortcut', description: 'Define a sequence of actions triggered by a keyword.', category: 'Personalization' },
  { name: 'organize_home_screen', description: 'Automatically group apps into folders based on category.', category: 'Personalization' },

  // --- ADVANCED CONTENT CREATION ---
  { name: 'trim_video', description: 'Shorten a video clip by specifying start and end points.', category: 'Content Creation' },
  { name: 'apply_image_filter', description: 'Add a visual style (e.g. Sepia, B&W) to a photo.', category: 'Content Creation' },
  { name: 'crop_image', description: 'Adjust the framing and aspect ratio of a picture.', category: 'Content Creation' },
  { name: 'extract_audio_from_video', description: 'Convert a video file into a standalone audio track.', category: 'Content Creation' },
  { name: 'transcribe_voice_memo', description: 'Convert a voice recording into a text document.', category: 'Content Creation' },
  { name: 'add_text_to_image', description: 'Overlay a caption or watermarks on a photo.', category: 'Content Creation' },
  { name: 'stitch_images', description: 'Combine multiple photos into a single panoramic or collage.', category: 'Content Creation' },
  { name: 'resize_media', description: 'Reduce the resolution or file size of a photo or video.', category: 'Content Creation' },
  { name: 'remove_image_background', description: 'Isolate the subject of a photo (AI removal).', category: 'Content Creation' },
  { name: 'reverse_video', description: 'Process a video clip to play backwards.', category: 'Content Creation' },
  { name: 'slow_mo_conversion', description: 'Change the frame rate to create a slow-motion effect.', category: 'Content Creation' },
  { name: 'combine_audio_tracks', description: 'Mix two or more audio files into one.', category: 'Content Creation' },

  // --- INTERNATIONAL & TRAVEL ---
  { name: 'track_flight_status', description: 'Get real-time arrival and gate info for a flight number.', category: 'Travel' },
  { name: 'translate_voice_live', description: 'Perform real-time speech translation for conversation.', category: 'Travel' },
  { name: 'lookup_world_clock', description: 'Check the current time in cities around the world.', category: 'Travel' },
  { name: 'check_visa_requirements', description: 'Get entry rules for a specific nationality.', category: 'Travel' },
  { name: 'list_embassy_contacts', description: 'Find emergency contact details for local embassies.', category: 'Travel' },
  { name: 'convert_timezone', description: 'Calculate times between two different time zones.', category: 'Travel' },
  { name: 'get_travel_advisory', description: 'Check for safety alerts and travel warnings.', category: 'Travel' },
  { name: 'find_offline_maps', description: 'Download map data for navigation without internet.', category: 'Travel' },

  // --- EDUCATION & LEARNING ---
  { name: 'create_flashcard', description: 'Save a question and answer for study sessions.', category: 'Education' },
  { name: 'start_study_timer', description: 'Initiate a Pomodoro session for focused learning.', category: 'Education' },
  { name: 'lookup_definition', description: 'Find the dictionary definition and etymology of a word.', category: 'Education' },
  { name: 'search_encyclopedia', description: 'Query Wikipedia or similar for detailed information.', category: 'Education' },
  { name: 'list_educational_courses', description: 'Show enrolled or available online learning modules.', category: 'Education' },
  { name: 'track_learning_habit', description: 'Log daily study time and progress milestones.', category: 'Education' },
  { name: 'solve_equation', description: 'Provide step-by-step solutions for complex math problems.', category: 'Education' },
  { name: 'get_synonyms_antonyms', description: 'Find alternative words to improve writing.', category: 'Education' },
  { name: 'practice_language', description: 'Initiate a short conversation practice in a foreign tongue.', category: 'Education' },

  // --- PROFESSIONAL & DEV TOOLS ---
  { name: 'check_git_status', description: 'Verify the current source code repository state.', category: 'Professional' },
  { name: 'toggle_developer_mode', description: 'Enable or disable hidden system developer settings.', category: 'Professional' },
  { name: 'list_running_processes', description: 'Show active system background tasks.', category: 'Professional' },
  { name: 'access_simulated_terminal', description: 'Run basic shell commands in a sandbox environment.', category: 'Professional' },
  { name: 'check_adb_status', description: 'Verify if Android Debug Bridge connectivity is active.', category: 'Professional' },
  { name: 'log_system_event', description: 'Create a manual entry in the developer debug log.', category: 'Professional' },
  { name: 'monitor_network_traffic', description: 'Show real-time data packets going in and out.', category: 'Professional' },
  { name: 'generate_uuid', description: 'Create a unique identifier for development tasks.', category: 'Professional' },
  { name: 'view_system_logs', description: 'Retrieve recent OS level error and info messages.', category: 'Professional' },
  { name: 'toggle_usb_debugging', description: 'Enable or disable direct hardware debugging access.', category: 'Professional' },
];
