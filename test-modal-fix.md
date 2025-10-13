# Add Room Modal Test Instructions

## Test Steps

1. Navigate to http://localhost:5000
2. Create a new project or edit an existing one
3. Go to Step 7 (Room Scope & Light & Air)
4. Click the "+ Add Room" button to open the modal

## Expected Behaviors

### ✅ Scroll Test
- The modal should have a max height of 90% viewport
- Content should be scrollable with a visible scrollbar
- All fields should be accessible by scrolling
- The Save/Cancel buttons should be fixed at the bottom, always visible

### ✅ Keyboard Shortcuts Test
- Click in any input field
- Press Ctrl+A (or Cmd+A on Mac)
- **Expected**: Only the text in the input field should be selected
- **Not Expected**: The entire page should NOT be highlighted

### ✅ Modal Stability Test
- Click on various form fields
- Type in inputs and textareas
- Toggle switches and checkboxes
- **Expected**: Modal should remain open when interacting with any form element
- **Not Expected**: Modal should NOT close unexpectedly

## Technical Implementation

### What was fixed:

1. **ScrollArea Wrapper**: Added `ScrollArea` component around dialog content
   - Content now scrolls internally within the modal
   - Max height set to 90vh to prevent overflow

2. **Keyboard Event Handling**: 
   - Added `onKeyDown` handlers to key input fields
   - `stopPropagation()` prevents Ctrl+A from bubbling to the page
   - Works with Ctrl/Cmd + A, C, V, X shortcuts

3. **Modal Layout**:
   - DialogContent uses `flex flex-col` layout
   - ScrollArea takes `flex-1` for scrollable content area
   - Buttons are outside ScrollArea in a fixed footer
   - Added padding and border-t to button footer for better UX

4. **Event Prevention**:
   - Added `onInteractOutside` handler to prevent unwanted modal closing
   - Checks if click target is inside form elements

## Code Changes

- Imported `ScrollArea` from `@/components/ui/scroll-area`
- Modified `DialogContent` class to `max-w-2xl max-h-[90vh] flex flex-col p-0`
- Wrapped room form content in `<ScrollArea className="flex-1 px-6 pb-6">`
- Moved buttons to a separate footer div outside ScrollArea
- Added keyboard event handlers to Input and Textarea components