# Generated manually — Seed recruiter attributes per sport
from django.db import migrations

def seed_sport_attributes(apps, schema_editor):
    Sport = apps.get_model('members', 'Sport')
    SportAttribute = apps.get_model('members', 'SportAttribute')
    
    attributes_by_sport = {
        'basketball': [
            ('wingspan', 'Wingspan', '📏', 'inches', True, 'Elite: 7ft+', 1),
            ('hand_size', 'Hand Size', '✋', 'inches', True, 'Elite: 9.5"+', 2),
            ('three_pt_percent', '3PT %', '🎯', 'percentage', True, 'Elite: 40%+', 3),
            ('free_throw_percent', 'FT %', '🎯', 'percentage', True, 'Elite: 85%+', 4),
            ('assist_to_turnover', 'Assist/TO Ratio', '👀', 'ratio', True, 'Elite: 3.0+', 5),
            ('rebounds_per_game', 'Rebounds/G', '🏀', 'per game', True, 'Elite: 10+ RPG', 6),
            ('lane_agility', 'Lane Agility Time', '⚡', 'seconds', True, 'Elite: sub-11s', 7),
        ],
        'football': [
            ('arm_length', 'Arm Length', '📏', 'inches', True, 'OL/DL Elite: 34"+', 1),
            ('qb_hand_size', 'Hand Size (QB)', '✋', 'inches', True, 'QB Elite: 9.5"+', 2),
            ('three_cone', '3-Cone Drill', '🔄', 'seconds', True, 'Elite: sub-7.0s', 3),
            ('broad_jump', 'Broad Jump', '🦘', 'inches', True, 'Elite: 10ft+', 4),
            ('ten_yd_split', '10-Yard Split', '⚡', 'seconds', True, 'Elite: sub-1.5s', 5),
            ('bench_reps_225', '225lb Bench Reps', '💪', 'reps', True, 'Elite: 25+', 6),
            ('vertical_jump_power', 'Vertical (Power)', '⬆️', 'inches', True, 'Elite: 38"+', 7),
        ],
        'baseball': [
            ('exit_velocity', 'Exit Velocity', '🚀', 'mph', True, 'Elite: 95+', 1),
            ('sixty_yd_dash', '60-Yard Dash', '🏃', 'seconds', True, 'Elite: sub-6.5s', 2),
            ('fielding_percentage', 'Fielding %', '🧤', 'percentage', True, 'Elite: .980+', 3),
            ('pop_time', 'Pop Time (Catcher)', '⏱️', 'seconds', True, 'Elite: sub-1.9s', 4),
            ('fastball_velocity', 'Fastball Velocity (P)', '🔥', 'mph', True, 'Elite: 93+', 5),
            ('home_to_first', 'Home-to-1B Time', '⚡', 'seconds', True, 'Elite: sub-4.0s', 6),
        ],
        'soccer': [
            ('pass_accuracy', 'Pass Accuracy', '🎯', 'percentage', True, 'Elite: 85%+', 1),
            ('distance_per_game', 'Distance Per Game', '🏃', 'miles', True, 'Elite: 7+ miles', 2),
            ('sprint_speed', 'Sprint Speed', '⚡', 'mph', True, 'Elite: 20+ mph', 3),
            ('one_v_one_win_rate', '1v1 Win Rate', '👤', 'percentage', True, 'Elite: 60%+', 4),
            ('crossing_accuracy', 'Crossing Accuracy', '🎯', 'percentage', True, 'Elite: 40%+', 5),
            ('shot_conversion', 'Shot Conversion %', '⚽', 'percentage', True, 'Elite: 20%+', 6),
        ],
        'track-and-field': [
            ('primary_event_pr', 'Primary Event PR', '🏅', 'varies', True, 'State qualifier level', 1),
            ('secondary_event_pr', 'Secondary Event PR', '🥈', 'varies', True, 'Complementary scoring', 2),
            ('split_time', 'Best Split Time', '⏱️', 'seconds', True, 'Negative splits ideal', 3),
            ('block_start_time', 'Block Start Time', '🏁', 'seconds', True, 'sub-0.15s elite', 4),
            ('race_stratification', 'Race Stratification', '📊', 'rating', False, 'Closer/front-runner', 5),
            ('personal_record_progression', 'PR Progression', '📈', 'trend', False, 'Year-over-year improvement', 6),
        ],
        'wrestling': [
            ('weight_class', 'Weight Class', '⚖️', 'lbs', True, 'Appropriate for build', 1),
            ('takedown_percentage', 'Takedown %', '🤼', 'percentage', True, 'Elite: 75%+', 2),
            ('match_record', 'Match Record', '📊', 'W-L', True, 'Elite: 40-3', 3),
            ('pin_rate', 'Pin Rate', '💪', 'percentage', True, 'Elite: 60%+', 4),
            ('escape_time', 'Average Escape Time', '⏱️', 'seconds', True, 'Elite: sub-2s', 5),
            ('ride_time', 'Average Ride Time', '⏱️', 'seconds', True, 'Control dominance', 6),
        ],
        'volleyball': [
            ('block_jump', 'Block Jump Reach', '📏', 'inches', True, 'Elite: 10ft+', 1),
            ('approach_jump', 'Approach Jump Reach', '⬆️', 'inches', True, 'Elite: 10ft 5"+', 2),
            ('kill_percentage', 'Kill %', '🎯', 'percentage', True, 'Elite: .350+', 3),
            ('serve_percentage', 'Serve %', '🏐', 'percentage', True, 'Elite: 90%+', 4),
            ('digs_per_set', 'Digs Per Set', '🧤', 'per set', True, 'Libero elite: 5+', 5),
            ('assists_per_set', 'Assists Per Set', '👀', 'per set', True, 'Setter elite: 10+', 6),
        ],
        'softball': [
            ('exit_velocity', 'Exit Velocity', '🚀', 'mph', True, 'Elite: 70+', 1),
            ('home_to_first', 'Home-to-1B Time', '⚡', 'seconds', True, 'Elite: sub-2.8s', 2),
            ('fielding_percentage', 'Fielding %', '🧤', 'percentage', True, 'Elite: .970+', 3),
            ('pitch_velocity', 'Pitch Velocity', '🔥', 'mph', True, 'Elite: 65+', 4),
            ('on_base_percentage', 'On-Base %', '📊', 'percentage', True, 'Elite: .450+', 5),
            ('slapping_accuracy', 'Slapping Accuracy', '🥎', 'percentage', True, 'Elite: 80%+', 6),
        ],
        'golf': [
            ('handicap', 'Handicap Index', '⛳', 'index', True, 'Elite: +2 or better', 1),
            ('driving_distance', 'Driving Distance', '🚀', 'yards', True, 'Elite: 300+', 2),
            ('gir_percentage', 'GIR %', '🎯', 'percentage', True, 'Elite: 75%+', 3),
            ('putts_per_round', 'Putts Per Round', '⛳', 'putts', True, 'Elite: sub-30', 4),
            ('scrambling_percentage', 'Scrambling %', '🛟', 'percentage', True, 'Elite: 65%+', 5),
            ('fairway_percentage', 'Fairways Hit %', '🎯', 'percentage', True, 'Elite: 80%+', 6),
        ],
        'tennis': [
            ('first_serve_percentage', 'First Serve %', '🎾', 'percentage', True, 'Elite: 65%+', 1),
            ('break_points_saved', 'Break Points Saved %', '🛡️', 'percentage', True, 'Elite: 70%+', 2),
            ('utr_rating', 'UTR Rating', '⭐', 'rating', True, 'Elite: 12+', 3),
            ('winner_to_error_ratio', 'Winner/Error Ratio', '📊', 'ratio', True, 'Elite: 1.5+', 4),
            ('first_serve_points_won', '1st Serve Points Won %', '⚡', 'percentage', True, 'Elite: 75%+', 5),
            ('net_points_won', 'Net Points Won %', '🏃', 'percentage', True, 'Elite: 70%+', 6),
        ],
    }
    
    for sport_slug, attrs in attributes_by_sport.items():
        try:
            sport = Sport.objects.get(slug=sport_slug)
        except Sport.DoesNotExist:
            continue
        
        for slug, name, icon, unit, measurable, benchmark, order in attrs:
            SportAttribute.objects.get_or_create(
                sport=sport,
                slug=slug,
                defaults={
                    'name': name,
                    'icon': icon,
                    'unit': unit,
                    'is_measurable': measurable,
                    'benchmark_text': benchmark,
                    'sort_order': order,
                    'description': f'{name} — Key stat recruiters evaluate for {sport.name}. {benchmark}'
                }
            )


def reverse_seed(apps, schema_editor):
    SportAttribute = apps.get_model('members', 'SportAttribute')
    SportAttribute.objects.all().delete()


class Migration(migrations.Migration):
    dependencies = [
        ('members', '0024_mediaasset_is_receipt_mediaasset_receipt_label_and_more'),
    ]

    operations = [
        migrations.RunPython(seed_sport_attributes, reverse_seed),
    ]
