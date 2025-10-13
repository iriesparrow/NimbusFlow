# Room Modal Persistence Fixes

## Summary of Fixes Applied

### 1. "No Windows" Checkbox Persistence Fix

**Problem**: The "No windows" checkbox wasn't persisting for Storage/Closet rooms even when exposure was not "interior".

**Root Cause**: 
- In `handleEditRoom`, the `hasWindows` field wasn't being explicitly preserved when loading room data
- In `handleSaveRoom`, the `hasWindows` value was being overridden with `editingRoom.hasWindows !== false`, which defaulted to `true`

**Solution Applied**:
1. Updated `handleEditRoom` (line 792-801) to explicitly preserve `hasWindows`:
   ```javascript
   hasWindows: room.hasWindows,
   ```

2. Fixed `handleSaveRoom` (line 1051-1059) to preserve the actual value:
   ```javascript
   // Preserve the actual hasWindows value from editingRoom
   hasWindows: editingRoom.hasWindows,
   ```

### 2. Borrowed Light Sources Persistence Fix

**Problem**: When saving a room with borrowed light sources selected, the selection wasn't persisting.

**Root Cause**: The `borrowedLightSources` array wasn't being properly included in the final room object sent to the API.

**Solution Applied**:
1. `handleEditRoom` already preserved `borrowedLightSources`: `borrowedLightSources: room.borrowedLightSources || []`

2. Updated `handleSaveRoom` to ensure `borrowedLightSources` is included in the final room object:
   ```javascript
   // Ensure borrowedLightSources is included
   borrowedLightSources: editingRoom.borrowedLightSources || []
   ```

## Testing Checklist

### Test Case 1: "No Windows" Checkbox
1. ✅ Create a new Storage/Closet room with exposure = "Street"
2. ✅ Check "No windows" checkbox
3. ✅ Save the room
4. ✅ Edit the room again
5. ✅ Verify checkbox is still checked
6. ✅ Verify the "No windows" badge appears in room list

### Test Case 2: Borrowed Light Sources
1. ✅ Create Room A with windows
2. ✅ Create Room B without windows
3. ✅ Edit Room B and enable "Borrowed Light/Air"
4. ✅ Select Room A as the source
5. ✅ Save Room B
6. ✅ Edit Room B again
7. ✅ Verify borrowed light is enabled
8. ✅ Verify Room A is selected in multiselect
9. ✅ Verify "Borrowed from Room A" badge appears

### Test Case 3: Different Room Types
1. ✅ Test with Kitchen (≥80 sq ft)
2. ✅ Test with Kitchenette (<80 sq ft)
3. ✅ Test with Bedroom
4. ✅ Test with Bathroom
5. ✅ Test with Closet/Storage

## Code Changes Made

### File: `client/src/components/project-wizard/step7-room-scope.tsx`

**Change 1** (Lines 792-801):
- Added explicit preservation of `hasWindows` field in `handleEditRoom`
- Ensures the checkbox state is loaded correctly when editing existing rooms

**Change 2** (Lines 1051-1059):
- Removed default logic that was overriding `hasWindows` value
- Added explicit inclusion of `borrowedLightSources` in final room object
- Ensures both fields persist correctly to the database

## Verification

The fixes ensure that:
1. The "No windows" checkbox appears for all rooms with non-interior exposure
2. The checkbox state persists correctly when saving and reloading
3. Borrowed light sources are saved and loaded correctly
4. The UI badges correctly reflect both states

## Notes

- The checkbox visibility is controlled by `editingRoom.exposure !== 'interior'` (line 2128)
- This is correct behavior - interior rooms don't have windows by definition
- For Storage/Closet rooms with street exposure, the checkbox now works correctly
- Borrowed light/air configuration is saved via separate API call when present (lines 1136-1216)