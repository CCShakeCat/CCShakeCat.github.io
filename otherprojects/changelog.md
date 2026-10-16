# )~MSUBBER - Subtitle Editor Changelog~(

## v1.0.0
First public release! Easy to use, but can do a lot

## v1.0.10
New Changelog and To-Do lists powered by markdown

## v1.1 - )~The Mobile and Motion Update~(
- Fixed Unfolded layout--Subtitle Events is now prominently on the left, while the video player, timeline, and customization is on the right
- Added missing HELP section to Mobile layout
- The timeline buttons on mobile are now smaller and have icons
- DESKTOP SITE now controls whether or not the Desktop layout is being used
-# **NOTE:** This may not work well on non-tablet or foldable devices, so it is highly not recommended
- The timeline now has momentum when scrolling with touch and trackpads, similar to scrolling on a webpage
- Added snapping to the timeline for adjustments that snap to each tick on the time ruler (CTRL+SHIFT+S on keyboard)
- The **Follow Playhead** (CTRL+SHIFT+P) setting has been adjusted slightly 
- Slightly modified Styling options to properly modify all selected subtitles at once

## v1.2.0 - )~The Speak and Seek Update~( 
- Fixed keybinds from CTRL+SHIFT to CTRL+ALT due to browser limitations
  - Follow Playhead is now CTRL+ALT+P
  - Ruler Snapping is now CTRL+ALT+S
- New SPLIT keybind (CTRL+SHIFT+B)
-# **NOTE:** CTRL+B opens up the BOOKMARKS menu, hence why ALT is added
- Splitting subtitles no longer require them to be selected on a timeline
  - Both the SPLIT button and CTRL+ALT+B now split the subtitle under the playhead
  - The playhead determines which subtitle gets split, regardless of the current selection
  - A toast will show if there is no subtitle under the playhead
- Cleaned up the main editor by moving Import Details to TOOLS / Debug and removing the obsolete video burning message
- Added a SPEAKER box for editing the [>> Speaker:]{#FFFF00} easier
    - Older projects will adapt to this new way of adding speakers
    - The SPEAKER box and is empty by default for continuation
    - Typing [???]{#FFFF00} or checking [Unknown Speaker]{#FFFF00} will display [>>]{#FFFF00}
    - The SPEAKER options will be included in the character counts for each subtitle
- The SUBTITLE box is now empty for quicker editing
- Increased Zoom limit from 40X to 80X 
- Added a Zoom display to show how far in  the Timeline is zoomed
- Trimming subtitles have been massively improved
    - With mouse and keyboard, the playhead hitbox has been shortened
    - Subtitle edges now have higher dragging priority over the playhead 
    
## v1.2.10
A hotfix has been released to adress some issues with the v1.2.0 update
- Fixed broken \[\]\{#RRGGBB\} and \[\]\{rgba(RR, GG, BB, A)\} markdown for colour in subtitles  and UI elements

## v1.2.20
A hotfix has been released to adress an issue with the v1.2.1 update
- Bold text will now properly render in the preview

## v1.3.0 - )~The Time and Space Update~(
# **[KNOWN ISSUES]{#FF5555}**
When you have more than 150 events at once, you may experience freezing or lag while editing. Optimization is in the works and will be available whenever it's ready

- Subtitle edges now clear the current subtitles onscreen when using the [TV Roll]{#FFFF00} style
- Added maximum [visible lines]{#FFFF00} setting in the Customization
- Fixed an issue where creating a new subtitle and putting it on top or bottom does not restart the on-screen subtitles 
- [Timeline rows]{#FFFF00} can now be used to create and customize up to three subtitles simultaneously
- Subtitles in the [Standard]{#FFFF00} style can now have myltiple lines per event
- Added subtitle splitting with [CTRL+Return]{#FFFF00}
- Readded the feature to merge with the previous subtitle
- Spacebar now consistenly plays and pauses the video instead of accidentally interacting with other objects onscreen
- Resizing text fields can now be done by [dragging the bottom edge]{#00FFFF}
- Added the ability to consistenly save your project to the same directory with [CTRL+S]{#FFFF00}, akin to other progeams with said feature
    - **Note:** Firefox currently has a limitation over Chromium browsers. To combat this is, The file will just be downloaded to the system instead
    
## v1.3.10
A hotfix has been released to address some issues with the v1.3.0 update
[Developers note: In this update, we have made optimizations, and all lag has been reduced, if not removed]{#00FFFF}
- Added a banner that gives a warning about VTTs' formatting being cleared in YouTube Studio
- Fixed an issue where exported timing would be messed up and/or carried onto the next subtitle
- Fixed the Zoom slider unintentionally displaying "1x" when the project was left zoomed in after loading.

## v1.3.20
A hotfix has been released to address some long existed issue:
Importing a VTT that used the [TV Roll]{#FFFF00} style will now separate the following:
- `>> Speaker:` will now input the correct Speaker settings
- The lowest line will now be displayed in its proper event 

## v1.3.30
- All media, subtitle, AND project files can now be oppened from a drag and drop
- The version number at the top has been updated
- Audio and Video is now
- Remove the Save Project, Undo, and Redo buttons at the top corner
- Fixed an issue where subtitle edges didn't snap to the playhead
- DUPLICATE HERE now properly duplicates the selected subtitle underneath it on the timeline
**[EXPERIMENTAL FEATURES]{#55FF55}**
- Added [Lightweight Typing Mode]{#FFFF00}, a setting that improves typing responsiveness.
    - Lightweight Typing Mode can be toggled in [TOOLS / Experimental Features]{#FFFF00}
    - Lightweight Typing Mode is enabled by default
    
## v1.3.31
- Fixed an issue where subtitle splitting would leave the rest of the text in the old subtitle
- Removed the [Sort by time]{#FFFF00} button
    - Each subtitle now correctly sorts the events chronologically from start to finish
    
## v1.4.0 - )~The Step by Step Update ~(
[Subtitle Exporting]{#55ff55}
- Added a new keybind to allow the user to easily show the export dialogue
- A new export option is available.
    - Checking [Animate Captions (Experimental)]{#ffff00} will add a typewriter build-in effect seen on channels like news, sports, some shows, and more  
[Developers note: Animated exporting is currently only compatible with WebVTT, which means text colours is still not compatible at this moment. We are working on adding support for a format that does support text colours.]{#00FFFF}

[Timeline Controls]{#55ff55}
- Added the ability to copy and paste subtitles
- When selecting multiple subtitles, they can be edited on the timeline
    - Dragging will now reorder all selected subtitles at once
    - Duplicating subtitles will now duplicate all selected subtitles
    - Trimming all selected subtitles will now trim them
        - If there is a subtitle in the way, all will be adjusted, like in Excel or Google Sheets when multiple rows or columns are selected

[Quality of Life Improvements]{#55ff55}
- Added a highlight to when the character limit is almost up and/or exceeded
- Reduced default character limit and warning to match with TV Roll standards
[Developers note: Markdown such as `**bold**` or `*italic*` will not count toward the character limit.]{#00FFFF}
- Importing all media has been flattened into one option for importing all types of media
- Added the ability to advance the playhead
    - Use `←` and `→` to nudge the playhead back and forth by one second
    - Use `,` and `.` to nudge the playhead back and forth by one frame

## v1.4.10
A hotfix has been released to address an issue with the 1.4.0 update
- Fixed an issue where the character warning/limit highlight was not including the `>> Speaker: ` text 
- New characters per line counter for standard mode
    - New warning to encourage users to split their subtitles either by splitting the subtitle itself or by line breaking
        - Pro Tip: Pressing the [Return]{#FFFF00} key alone breaks a line. Pressing [CTRL/COMMAND+Return]{#FFFF00} will split the current subtitle at the word and playhead position
    