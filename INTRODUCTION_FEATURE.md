# Introduction Pages Feature

## Overview
This feature adds interactive introduction modals for first-time visitors to three main pages: Tracker, Diet, and Weekly Challenge. The introductions guide users through the features and functionality of each page.

## Implementation

### 1. IntroductionModal Component
**Location:** `src/components/IntroductionModal.tsx`

A reusable modal component that:
- Shows on first visit to a page (tracked via localStorage)
- Features multi-step walkthrough with progress indicators
- Includes smooth animations and transitions
- Allows users to skip or navigate through steps
- Automatically saves completion status

### 2. Pages Updated

#### Tracker Page (`/tracker`)
**Location:** `src/pages/Index.tsx`

**Introduction Steps:**
1. **Track Your Meals** - Explains photo capture and AI analysis
2. **Monitor Your Progress** - Shows calorie tracking and macros breakdown
3. **Stay Consistent** - Encourages daily logging for better insights

#### Diet Page (`/diet`)
**Location:** `src/pages/Diet.tsx`

**Introduction Steps:**
1. **Multiple Meal Options** - Explains 3 options per meal
2. **Select Your Preferences** - Shows how to choose meal options
3. **Save & Start Tracking** - Guides on saving and tracking

#### Weekly Challenge Page (`/weekly-challenge`)
**Location:** `src/pages/WeeklyChallenge.tsx`

**Introduction Steps:**
1. **7-Day Food Journey** - Explains the 7-day tracking system
2. **Log Your Meals** - Shows how to add meals with AI analysis
3. **Get Personalized Diet** - Explains the reward for completion

### 3. Utility Functions
**Location:** `src/lib/introUtils.ts`

Provides utility functions to:
- Reset individual introductions
- Reset all introductions at once
- Check if user has seen an introduction

### 4. Profile Page Integration
**Location:** `src/pages/Profile.tsx`

Added a "Help & Tutorials" section where users can:
- Reset individual tutorial for Tracker, Diet, or Weekly Challenge
- Reset all tutorials at once
- Get confirmation toasts when tutorials are reset

## Usage

### For First-Time Users
1. Visit `/tracker`, `/diet`, or `/weekly-challenge`
2. Introduction modal automatically appears
3. Navigate through steps using "Next" button
4. Click "Skip" to dismiss or "Get Started" on final step
5. Modal won't show again (stored in localStorage)

### For Returning Users
1. Go to Profile page
2. Scroll to "Help & Tutorials" section
3. Click the specific tutorial button to reset
4. Visit the page again to see the introduction

## Technical Details

### localStorage Keys
- `tracker-intro-seen` - Tracker page introduction
- `diet-intro-seen` - Diet page introduction
- `weekly-challenge-intro-seen` - Weekly Challenge page introduction

### Features
- ✅ Responsive design (mobile & desktop)
- ✅ Smooth animations and transitions
- ✅ Progress indicators
- ✅ Skip functionality
- ✅ Keyboard accessible
- ✅ Dark/light theme compatible
- ✅ Persistent state via localStorage
- ✅ Reset functionality in Profile

## User Benefits
1. **Better Onboarding** - New users understand features immediately
2. **Reduced Confusion** - Clear explanations of complex features
3. **Increased Engagement** - Users know what they can do
4. **Flexible Learning** - Can review tutorials anytime from Profile

## Future Enhancements
- Add video tutorials or GIFs
- Track which steps users skip most
- Add contextual help tooltips throughout the app
- Multi-language support for introductions

