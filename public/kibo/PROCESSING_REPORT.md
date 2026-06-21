# Kibo Asset Processing Report

## Summary

- Images processed: 13
- Videos processed: 13 / 13
- Originals were preserved.
- The Kibo TypeScript media registry now points to processed assets only.

## Image Processing

Images were exported as transparent PNGs in `/public/kibo/images/processed`. A connected-background removal pass was used to preserve Kibo, outlines, foreground objects, and visible character detail while removing the white/off-white field.

## Video Processing

Videos were exported as VP9 WebM files in `/public/kibo/videos/processed`. Each processed video reports `alpha_mode=1`, but quality is flagged as approximate because alpha was derived from compressed MP4 files with white/off-white backgrounds.

## Regeneration Recommendation

For final production quality, regenerate each Kibo animation from Google Flow or the source animation tool with native transparent background export. This will avoid white fringe artifacts and preserve cleaner semi-transparent motion edges.

## Flagged Video Assets

### /kibo/videos/announcement.mp4

- Processed: /kibo/videos/processed/announcement.webm
- Issue: Transparency was derived by keying a compressed white/off-white MP4 background. Edge halos or background remnants may remain.
- Recommendation: Regenerate from Google Flow using transparent background exports before final brand lock.

### /kibo/videos/badge.mp4

- Processed: /kibo/videos/processed/badge.webm
- Issue: Transparency was derived by keying a compressed white/off-white MP4 background. Edge halos or background remnants may remain.
- Recommendation: Regenerate from Google Flow using transparent background exports before final brand lock.

### /kibo/videos/celebrate.mp4

- Processed: /kibo/videos/processed/celebrate.webm
- Issue: Transparency was derived by keying a compressed white/off-white MP4 background. Edge halos or background remnants may remain.
- Recommendation: Regenerate from Google Flow using transparent background exports before final brand lock.

### /kibo/videos/idle.mp4

- Processed: /kibo/videos/processed/idle.webm
- Issue: Transparency was derived by keying a compressed white/off-white MP4 background. Edge halos or background remnants may remain.
- Recommendation: Regenerate from Google Flow using transparent background exports before final brand lock.

### /kibo/videos/inactivity.mp4

- Processed: /kibo/videos/processed/inactivity.webm
- Issue: Transparency was derived by keying a compressed white/off-white MP4 background. Edge halos or background remnants may remain.
- Recommendation: Regenerate from Google Flow using transparent background exports before final brand lock.

### /kibo/videos/marketplace.mp4

- Processed: /kibo/videos/processed/marketplace.webm
- Issue: Transparency was derived by keying a compressed white/off-white MP4 background. Edge halos or background remnants may remain.
- Recommendation: Regenerate from Google Flow using transparent background exports before final brand lock.

### /kibo/videos/peek.mp4

- Processed: /kibo/videos/processed/peek.webm
- Issue: Transparency was derived by keying a compressed white/off-white MP4 background. Edge halos or background remnants may remain.
- Recommendation: Regenerate from Google Flow using transparent background exports before final brand lock.

### /kibo/videos/project-star.mp4

- Processed: /kibo/videos/processed/project-star.webm
- Issue: Transparency was derived by keying a compressed white/off-white MP4 background. Edge halos or background remnants may remain.
- Recommendation: Regenerate from Google Flow using transparent background exports before final brand lock.

### /kibo/videos/sleeping.mp4

- Processed: /kibo/videos/processed/sleeping.webm
- Issue: Transparency was derived by keying a compressed white/off-white MP4 background. Edge halos or background remnants may remain.
- Recommendation: Regenerate from Google Flow using transparent background exports before final brand lock.

### /kibo/videos/streak.mp4

- Processed: /kibo/videos/processed/streak.webm
- Issue: Transparency was derived by keying a compressed white/off-white MP4 background. Edge halos or background remnants may remain.
- Recommendation: Regenerate from Google Flow using transparent background exports before final brand lock.

### /kibo/videos/thinking.mp4

- Processed: /kibo/videos/processed/thinking.webm
- Issue: Transparency was derived by keying a compressed white/off-white MP4 background. Edge halos or background remnants may remain.
- Recommendation: Regenerate from Google Flow using transparent background exports before final brand lock.

### /kibo/videos/warning.mp4

- Processed: /kibo/videos/processed/warning.webm
- Issue: Transparency was derived by keying a compressed white/off-white MP4 background. Edge halos or background remnants may remain.
- Recommendation: Regenerate from Google Flow using transparent background exports before final brand lock.

### /kibo/videos/wave.mp4

- Processed: /kibo/videos/processed/wave.webm
- Issue: Transparency was derived by keying a compressed white/off-white MP4 background. Edge halos or background remnants may remain.
- Recommendation: Regenerate from Google Flow using transparent background exports before final brand lock.
