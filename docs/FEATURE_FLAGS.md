# 🏷️ Feature Flags Guide

> Feature flags allow you to enable/disable optional modules without modifying code.

---

## Available Flags

| Setting | Default | Description |
|---------|---------|-------------|
| `SPORTS_MODULE_ENABLED` | `False` | Athlete stats, drills, scouting, leaderboards |
| `STREAMING_PLATFORMS_ENABLED` | `True` | Multi-platform streaming (YouTube, Facebook, etc.) |
| `STREAMING_MULTICAST_ENABLED` | `True` | Multicast streaming support |
| `STREAMING_OWNCAST_ENABLED` | `False` | Owncast as streaming destination |
| `FFMPEG_COMPOSITION_ENABLED` | `True` | FFmpeg video composition for portrait/overlay |
| `DEBUG` | `False` | Django debug mode (never enable in production!) |

---

## How Flags Work

Flags are set in `.env`:

```ini
# .env
SPORTS_MODULE_ENABLED=True
```

The Django backend then conditionally:

- **Registers or skips URL patterns** (`urls.py`)
- **Includes or excludes serializer fields** (`serializers.py`)
- **Shows or hides admin registrations** (`admin.py`)

Models are **always compiled** into the database (to avoid migration complexity), but are effectively disabled when the flag is off.

---

## SPORTS_MODULE_ENABLED

When `True`, these features become available:

### API Endpoints
| Endpoint | Purpose |
|----------|---------|
| `/api/sports/` | List available sports |
| `/api/sports/attributes/` | Per-sport recruiter attributes |
| `/api/stats/update/` | Record a stat entry (with history) |
| `/api/stats/history/<type>/` | Trend data for stat tracking |
| `/api/leaderboard/<type>/` | Top athletes per stat |
| `/api/stats/verifications/` | Video proof management |
| `/api/drills/` | Drill library (CRUD) |
| `/api/media/<id>/tags/` | Key-value media tags |

### Profile Fields Added
When disabled, the `Profile` model still stores these fields in the DB, but the API serializer excludes them:
- `hudl_link`, `maxpreps_link`, `twitter_x_link`
- `graduation_year`, `position`, `school_name`
- `state`, `sports` (M2M)
- `height_ft`, `height_in`, `weight_lbs`
- `sport_specific_stats`
- `vertical_jump_in`, `forty_yard_time`
- `max_bench_lbs`, `max_squat_lbs`, `max_power_clean_lbs`
- `shuttle_time`, `gpa`
- `is_verified_coach`, `years_of_experience`, `certifications`

### Admin Models (hidden when disabled)
- `Sport` / `SportAttribute`
- `AthleteStatEntry`
- `StatVerificationVideo`
- `MediaTag`
- `Drill` / `LiveVerificationRequest`

---

## Adding a New Feature Flag

1. Add to `backend/settings.py`:
   ```python
   MY_FEATURE_ENABLED = env('MY_FEATURE_ENABLED', default=False, cast=bool)
   ```

2. Add to `.env.example`:
   ```ini
   MY_FEATURE_ENABLED=False
   ```

3. Guard URL patterns:
   ```python
   if settings.MY_FEATURE_ENABLED:
       urlpatterns += [
           path('api/my-feature/', MyFeatureView.as_view()),
       ]
   ```

4. Guard admin registrations:
   ```python
   if settings.MY_FEATURE_ENABLED:
       admin.site.register(MyModel)
   ```

5. Guard serializer fields (optional):
   ```python
   fields = [...]
   if settings.MY_FEATURE_ENABLED:
       fields += ['my_extra_field']
   ```
