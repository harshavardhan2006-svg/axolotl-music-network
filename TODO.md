# TODO: Clear Hall Data and Fix Chat Access Errors

## Current Issue
- After clearing hall data, users get "error fetching hall chat page" when clicking on halls
- Backend membership checks fail, causing 403 errors even for admins
- Hall.members array may be corrupted after data clearing

## Tasks
- [x] Clear all hall data (halls, messages, queue data)
- [x] Fix backend membership check in hallChatController.js to ensure admins always have access
- [x] Add hall data repair in hallController.js to ensure admin is always in members array
- [x] Improve frontend error handling in useHallChatStore.ts for better user feedback
- [x] Add graceful fallback in HallDetailPage.tsx when chat access is denied
- [x] Test the fixes by clearing data and accessing halls

## Files to Edit
- backend/src/controller/hallChatController.js
- backend/src/controller/hallController.js
- frontend/src/stores/useHallChatStore.ts
- frontend/src/pages/hall-detail/HallDetailPage.tsx
