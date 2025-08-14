# Animation Testing Guide for Atila Reservas

## Overview
This document provides guidance on testing the animations implemented in the Atila Reservas application across different browsers and devices.

## Browsers to Test
1. **Chrome** (Latest version)
2. **Firefox** (Latest version)
3. **Safari** (Latest version)
4. **Edge** (Latest version)
5. **Mobile Chrome** (Android)
6. **Mobile Safari** (iOS)

## Devices to Test
1. **Desktop** (1920x1080 resolution minimum)
2. **Laptop** (1366x768 resolution minimum)
3. **Tablet** (Portrait and Landscape)
4. **Mobile Phone** (Portrait and Landscape)

## Animation Components to Verify

### 1. Dashboard Tab Transitions
- **Location**: Main dashboard page
- **Test**: Switch between Reservas, Finanzas, Papelera, and Configuración tabs
- **Expected Behavior**: Smooth fade transition between tab content with 300ms duration

### 2. Calendar Interactions
- **Location**: Reservation Calendar component
- **Test**: 
  - Hover over calendar days
  - Click on a calendar day
  - Navigate between months
- **Expected Behavior**: 
  - Days should scale up 5% on hover with 200ms transition
  - Clicked days should have a subtle pulse animation
  - Month navigation should be smooth

### 3. Form Interactions
- **Location**: New Reservation Form
- **Test**:
  - Focus on input fields
  - Click submit button
  - Check validation errors
- **Expected Behavior**:
  - Input fields should have focus ring animation
  - Submit button should show loading spinner when clicked
  - Form should have smooth transitions between states

### 4. Card Components
- **Location**: All card components (Calendar, Form, Reservations List, etc.)
- **Test**: 
  - Hover over cards
  - Observe entrance animations
- **Expected Behavior**:
  - Cards should lift slightly and gain shadow on hover
  - Entrance animations should be smooth and not jarring

### 5. Dialog Animations
- **Location**: Reservation Details Dialog
- **Test**: 
  - Open dialog by clicking on a calendar day with reservations
  - Close dialog
- **Expected Behavior**:
  - Dialog should scale in smoothly with 300ms duration
  - Content should fade in with staggered animation

### 6. Loading States
- **Location**: Login form, Reservation form submission
- **Test**:
  - Submit forms
  - Navigate between pages
- **Expected Behavior**:
  - Loading spinners should be smooth
  - Buttons should show loading state with animation

### 7. Micro-interactions
- **Location**: Buttons, Checkboxes, Reservation list items
- **Test**:
  - Hover over buttons
  - Click checkboxes
  - Hover over reservation list items
- **Expected Behavior**:
  - Buttons should scale slightly on hover
  - Checkboxes should have smooth check animations
  - List items should have hover effects

## Performance Testing
1. **Frame Rate**: All animations should maintain 60fps
2. **Battery Usage**: Animations should not significantly impact battery life on mobile devices
3. **Memory Usage**: Animations should not cause memory leaks

## Accessibility Testing
1. **Reduced Motion**: Animations should respect `prefers-reduced-motion` media query
2. **Screen Readers**: Animations should not interfere with screen reader functionality
3. **Keyboard Navigation**: All animated elements should be accessible via keyboard

## Testing Checklist
- [ ] Chrome on Desktop
- [ ] Firefox on Desktop
- [ ] Safari on Desktop
- [ ] Edge on Desktop
- [ ] Mobile Chrome on Android
- [ ] Mobile Safari on iOS
- [ ] Tablet in Portrait mode
- [ ] Tablet in Landscape mode
- [ ] Mobile in Portrait mode
- [ ] Mobile in Landscape mode
- [ ] Performance testing completed
- [ ] Accessibility testing completed

## Troubleshooting
1. **Animations not working**: Check browser compatibility and JavaScript errors
2. **Choppy animations**: Reduce animation complexity or duration
3. **High CPU usage**: Optimize animations to use `transform` and `opacity` properties

## Optimization Notes
1. All animations use CSS transitions and keyframes for performance
2. Hardware acceleration is enabled through `transform` properties
3. Animations are optimized for mobile devices
4. Fallbacks are provided for older browsers