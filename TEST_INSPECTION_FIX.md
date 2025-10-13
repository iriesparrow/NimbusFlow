# Inspection Auto-Selection Fix - Test Procedure

## Issue Fixed
The inspection auto-selection feature in Step 8 (Compliance Check) was not working because:
- Step 7 was saving room data under `data.roomSelections`
- Step 8 was looking for room data under `data.rooms` (incorrect field name)

## Solution Applied
Updated `client/src/components/project-wizard/step8-compliance-check.tsx`:
1. Fixed the data field reference from `data.rooms` to `data.roomSelections`
2. Added debug console logging to track data flow
3. Added fallback to handle both field names for backward compatibility

## Test Procedure

### Test Case 1: Kitchen ≥80 sq ft
1. Open the browser developer console (F12)
2. Navigate to the project creation wizard
3. Complete steps 1-6 normally
4. In Step 7 (Room Scope):
   - Click "Add Room"
   - Enter room name: "Kitchen"
   - Floor: 1st
   - Manual Square Footage: 100
   - Mark as Habitable: Yes
   - Save the room
5. Click "Continue to Inspections"
6. In Step 8 (Compliance Check):
   - Check the browser console for debug logs
   - You should see:
     - "Step 8 - Incoming data:" showing roomSelections array
     - "Kitchen detected: Kitchen, Floor area: 100 sq ft"
     - "Kitchen meets ≥80 sq ft requirement, adding inspection"
   - The UI should show at least 1 triggered inspection: "Kitchen Inspection"
   - If the kitchen has no window, it should also show "Natural Light & Air Compliance"

### Test Case 2: Kitchenette <80 sq ft
1. Repeat steps 1-4 but with:
   - Room name: "Kitchenette"
   - Manual Square Footage: 50
2. Expected results:
   - Should trigger "Smoke Soffit Installation" inspection
   - If no window, should trigger "Mechanical HVAC Inspection"

### Expected Console Output
```javascript
// When entering Step 8:
Step 8 - Incoming data: {
  data.rooms: undefined,
  data.roomSelections: [{id: "...", proposedName: "Kitchen", ...}]
}
Step 8 - Analyzing rooms for inspections: [...]
Processing room: {
  id: "...",
  name: "Kitchen",
  classification: "Kitchen",
  floorArea: 100,
  isNonEnclosedSpace: false
}
Kitchen detected: Kitchen, Floor area: 100 sq ft
Kitchen meets ≥80 sq ft requirement, adding inspection
Step 8 - Triggered inspections: [...]
```

## Verification Checklist
- [ ] Room data is passed from Step 7 to Step 8
- [ ] Console shows debug logging with room data
- [ ] Kitchen ≥80 sq ft triggers "Kitchen Inspection"
- [ ] Kitchenette <80 sq ft triggers appropriate inspections
- [ ] Inspection count badge shows correct number
- [ ] Inspections can be toggled on/off with override reasons
- [ ] Continue button saves triggered inspections to wizard data

## Notes
- The fix is backward-compatible, checking both `data.roomSelections` and `data.rooms`
- Debug logging can be removed once testing is complete
- The client-side inspection logic mirrors backend logic but operates independently during wizard flow