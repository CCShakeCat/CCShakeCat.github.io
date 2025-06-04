This is a page for Mimi's clock-related stuff

# CURRENT PROJECTS
## Real Time Clock (RTC)
(null)

## Countdown Timer
(null)

## Stopwatch - v1.2
A stopwatch timer that was inspired off of [Jcog](https://twitch.tv/jcog)'s timer, but with no craziness. I just wanted it to be custom :)
### Changelog
v1.0 - Original Release, Barebones, One font\
~~v1.1 - "Readability" font setting, Dropdown for ms customization~~ **SCRAPPED**\
v1.2 - Slight revamp of the clock and code
- ⚪ White text on ⬛ black background (easier for colour change editing)
- New Settings menu with a font changer. The display has a "forced monospace" property which will eliminate the jitteriness of otherwise professional fonts, making them easier to read, and better on the eyes
  - **Default** - Fancy Cat PX. A tabular font suitable for a clock!
  - **System** - An OS-specific setting. iOS/Mac will use San Francisco, Android will use Roboto, and Windows will use Segoe UI
  - **Custom** - Upload your own TTF, OTF, or WOFF. **Note- You may need to refresh the page once you've uploaded a file!**
- The Stopwatch itself now uses the "wall-clock" method of keeping track of elapsed time, which is a fancy way of saying it no longer freezes when unfocusing or minimizing the tab or window altogether
**v1.2.10 - Added icons to the files and reworked the settings button / modal text**

### -TO-DO- (Top = most priority)
- Add a Keybind section to change how the START/STOP and RESET buttons work
- Make the START/STOP button change from START to STOP when started or stopped
- **KNOWN ISSUE** Apple devices use Helvetica when using the System font setting
- Add the ability to change the "Milliseconds" to a value between 10-100. Due to current difficulties, 40 is the hardcoded value
- Add a colour customizer with a colour picker and HEX value support
