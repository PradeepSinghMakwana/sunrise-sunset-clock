# TODO

## Cursor-guided onboarding tutorial

- [ ] Replace the incorrect animal-mouse concept with a computer mouse cursor/pointer that demonstrates Android touch interactions.
- [ ] Create a coherent six-stage first-run tutorial:
  1. [ ] Welcome: introduce Sunrise Sunset Clock and the tutorial controls.
  2. [ ] Location: demonstrate the Android location permission flow and explain why location is needed.
  3. [ ] Privacy: clearly explain what location data is used for, what is stored on-device, and any edition-specific data handling.
  4. [ ] Dashboard: point out sunrise, sunset, and daylight-duration information.
  5. [ ] Widget: demonstrate opening the Android widget picker, placing the widget, and interacting with it.
  6. [ ] Settings: highlight the relevant settings and explain their effects.
- [ ] Animate a cursor moving to real touch targets, with a trailing cursor-motion trail, tap ripple, and target highlight.
- [ ] Synchronize narration with cursor movement and each demonstrated interaction.
- [ ] Provide skip, replay, and next controls.
- [ ] Demonstrate touch gestures; do not imply that a physical mouse is required on Android.
- [ ] Use real app screens and interface elements as the underlying tutorial visuals once the relevant UI is available.
- [ ] Create separate, focused animations for distinct interactions rather than one oversized GIF.
- [ ] Keep the four agreed visual directions (dashboard, location, settings, and widget) visually coherent.
- [ ] Clearly label storyboard/mockup material as proposed UX until it matches implemented app behaviour.
- [ ] Verify every permission, privacy, and data-handling statement against the actual implementation before release.
- [ ] Add the final tutorial assets and documentation to the README only after the assets exist and have been reviewed.
- [ ] Test the tutorial on supported Android versions, including navigation, replay, skip, narration timing, and accessibility.

**Status:** Planned; no tutorial assets or in-app tutorial implementation are claimed by this checklist.
