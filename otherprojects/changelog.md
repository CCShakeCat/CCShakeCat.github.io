# )~MSUBBER - Subtitle Editor Changelog~(

## v1.0
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

## v1.1.1
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