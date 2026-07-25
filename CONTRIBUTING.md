# 🤝 Contributing to IN the GAME Media Site

We love contributions! Here's how to help.

---

## 🧭 Code of Conduct

Be respectful, constructive, and professional. We're all here to build something great.

---

## 🐛 Reporting Bugs

Open an issue with:
1. Clear description of the bug
2. Steps to reproduce
3. Expected vs actual behavior
4. Screenshots if applicable
5. Environment (Docker / bare metal, browser, etc.)

---

## 💡 Feature Requests

Open an issue with:
1. What you want to achieve
2. How it fits the platform's mission
3. Any implementation ideas

---

## 🔀 Pull Requests

1. **Fork** the repo
2. **Branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes**
4. **Test** your changes:
   ```bash
   python manage.py test
   ```
5. **Commit** with clear messages:
   ```bash
   git commit -m "feat: add guest reconnection timeout"
   ```
6. **Push** and open a PR

### PR Guidelines

| Do | Don't |
|----|-------|
| ✅ Keep PRs focused (one feature/fix per PR) | ❌ Mix unrelated changes |
| ✅ Add/update tests | ❌ Break existing functionality |
| ✅ Update docs if needed | ❌ Include credentials or secrets |
| ✅ Write clear commit messages | ❌ Leave debug code |

---

## 🧪 Development Setup

```bash
cp .env.example .env
# Set DEBUG=True for development

source .venv/bin/activate
python manage.py runserver 0.0.0.0:8000
```

---

## 🏷️ Feature Flags

New modules should be added behind a feature flag. See `docs/FEATURE_FLAGS.md`.

Add your flag to `backend/settings.py`:
```python
YOUR_FEATURE_ENABLED = env('YOUR_FEATURE_ENABLED', default=False, cast=bool)
```

---

## 📝 Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` — New feature
- `fix:` — Bug fix
- `docs:` — Documentation
- `style:` — Formatting
- `refactor:` — Code restructuring
- `test:` — Tests
- `chore:` — Maintenance

---

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License (see [LICENSE](LICENSE)).
