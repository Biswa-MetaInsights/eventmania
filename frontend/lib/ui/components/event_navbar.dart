import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:go_router/go_router.dart';
import 'package:eventmind_platform/blocs/auth_provider.dart';
import 'package:eventmind_platform/blocs/event_provider.dart';

const _kGreen = Color(0xFF184E4A);
const _kLinen = Color(0xFFF2EFEA);
const _kText = Color(0xFF111827);
const _kBorder = Color(0xFFE2DDD5);

// Hover style shared across all interactive nav elements:
// background → #184E4A, text/icon → linen
ButtonStyle _hoverStyle({
  EdgeInsetsGeometry padding =
      const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
  double radius = 6,
  Color defaultFg = _kText,
}) =>
    ButtonStyle(
      backgroundColor: WidgetStateProperty.resolveWith((s) =>
          s.contains(WidgetState.hovered) ? _kGreen : Colors.transparent),
      foregroundColor: WidgetStateProperty.resolveWith(
          (s) => s.contains(WidgetState.hovered) ? _kLinen : defaultFg),
      overlayColor: WidgetStateProperty.all(Colors.transparent),
      padding: WidgetStateProperty.all(padding),
      shape: WidgetStateProperty.all(
          RoundedRectangleBorder(borderRadius: BorderRadius.circular(radius))),
    );

ButtonStyle _hoverMenuItemStyle({Color defaultFg = _kText}) => ButtonStyle(
      backgroundColor: WidgetStateProperty.resolveWith((s) =>
          s.contains(WidgetState.hovered) ? _kGreen : Colors.transparent),
      foregroundColor: WidgetStateProperty.resolveWith(
          (s) => s.contains(WidgetState.hovered) ? _kLinen : defaultFg),
      overlayColor: WidgetStateProperty.all(Colors.transparent),
      padding: WidgetStateProperty.all(
          const EdgeInsets.symmetric(horizontal: 16, vertical: 12)),
    );

class EventNavbar extends ConsumerStatefulWidget {
  const EventNavbar({super.key});

  @override
  ConsumerState<EventNavbar> createState() => _EventNavbarState();
}

class _EventNavbarState extends ConsumerState<EventNavbar> {
  final _searchController = TextEditingController();
  final _eventsController = MenuController();
  final _groupsController = MenuController();
  final _avatarController = MenuController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _closeAllMenus() {
    _eventsController.close();
    _groupsController.close();
    _avatarController.close();
  }

  /// "biswajith.gopinathan@gmail.com" → "Biswajith"
  String _displayName(String? email) {
    if (email == null || email.isEmpty) return '';
    final prefix = email.split('@').first;
    final segment = prefix.contains('.') ? prefix.split('.').first : prefix;
    final cleaned = segment.isNotEmpty ? segment : prefix;
    return cleaned[0].toUpperCase() + cleaned.substring(1).toLowerCase();
  }

  void _comingSoon() {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content:
            Text('Event Groups — coming soon!', style: GoogleFonts.outfit()),
        backgroundColor: _kGreen,
        duration: const Duration(seconds: 2),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authProvider);

    return Container(
      height: 72,
      padding: const EdgeInsets.symmetric(horizontal: 48),
      decoration: const BoxDecoration(
        color: _kLinen,
        border: Border(
          bottom: BorderSide(color: Color(0xFFC8C1B8), width: 1),
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // ── Logo + Wordmark ───────────────────────────────────────
          MouseRegion(
            onEnter: (_) => _closeAllMenus(),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Image.asset('assets/images/logo.png',
                    height: 30, fit: BoxFit.contain),
                const SizedBox(width: 10),
                Text(
                  'EventMind',
                  style: GoogleFonts.outfit(
                    fontSize: 19,
                    fontWeight: FontWeight.w800,
                    color: _kGreen,
                    letterSpacing: 0.2,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 24),

          // ── Search bar ───────────────────────────────────────────
          MouseRegion(
            onEnter: (_) => _closeAllMenus(),
            child: SizedBox(
              width: 380,
              height: 40,
              child: Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: _kBorder),
                ),
                child: Row(
                  children: [
                    const SizedBox(width: 12),
                    const Icon(Icons.search_rounded,
                        size: 17, color: Color(0xFF9CA3AF)),
                    const SizedBox(width: 8),
                    Expanded(
                      child: TextField(
                        controller: _searchController,
                        onChanged: (val) => ref
                            .read(eventProvider.notifier)
                            .fetchEvents(query: val),
                        style: GoogleFonts.outfit(fontSize: 14, color: _kText),
                        decoration: InputDecoration(
                          hintText: 'Search events or event groups',
                          hintStyle: GoogleFonts.outfit(
                              fontSize: 14, color: const Color(0xFF9CA3AF)),
                          border: InputBorder.none,
                          isDense: true,
                          contentPadding: EdgeInsets.zero,
                        ),
                      ),
                    ),
                    Container(width: 1, height: 18, color: _kBorder),
                    const SizedBox(width: 8),
                    const Icon(Icons.location_on_outlined,
                        size: 15, color: Color(0xFF9CA3AF)),
                    const SizedBox(width: 3),
                    Text('Add Location',
                        style: GoogleFonts.outfit(
                            fontSize: 14,
                            color: const Color(0xFF9CA3AF))),
                    const SizedBox(width: 12),
                  ],
                ),
              ),
            ),
          ),

          const Spacer(),

          // ── Events dropdown ──────────────────────────────────────
          _NavDropdown(
            label: 'Events',
            menuController: _eventsController,
            onHoverOpen: () {
              _groupsController.close();
              _avatarController.close();
            },
            items: [
              _NavItem('🔍', 'Explore Events', () => context.go('/')),
              _NavItem(
                  '➕', 'Create Event', () => context.push('/organizer/create')),
              _NavItem(
                '📅',
                'My Events',
                () =>
                    context.push(auth.isAuthenticated ? '/dashboard' : '/auth'),
              ),
            ],
          ),
          const SizedBox(width: 8),

          // ── Groups dropdown ──────────────────────────────────────
          _NavDropdown(
            label: 'Groups',
            menuController: _groupsController,
            onHoverOpen: () {
              _eventsController.close();
              _avatarController.close();
            },
            items: [
              _NavItem('🔍', 'Explore Groups', _comingSoon),
              _NavItem('➕', 'Create Group', _comingSoon),
              _NavItem('👥', 'My Groups', _comingSoon),
            ],
          ),
          const SizedBox(width: 8),

          // ── Help ─────────────────────────────────────────────────
          MouseRegion(
            onEnter: (_) => _closeAllMenus(),
            child: TextButton(
              onPressed: () {},
              style: _hoverStyle(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              ),
              child: Text('Help',
                  style: GoogleFonts.outfit(
                      fontSize: 15, fontWeight: FontWeight.w500)),
            ),
          ),

          // ── Notification bell (logged in only) ───────────────────
          if (auth.isAuthenticated) ...[
            const SizedBox(width: 8),
            MouseRegion(
              onEnter: (_) => _closeAllMenus(),
              child: IconButton(
                onPressed: () {},
                tooltip: 'Notifications',
                style: ButtonStyle(
                  backgroundColor: WidgetStateProperty.resolveWith((s) =>
                      s.contains(WidgetState.hovered)
                          ? _kGreen
                          : Colors.transparent),
                  foregroundColor: WidgetStateProperty.resolveWith((s) =>
                      s.contains(WidgetState.hovered) ? _kLinen : _kText),
                  overlayColor: WidgetStateProperty.all(Colors.transparent),
                  shape: WidgetStateProperty.all(RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(6))),
                ),
                icon: const Icon(Icons.notifications_outlined, size: 21),
              ),
            ),
          ],

          const SizedBox(width: 12),

          // ── Sign In or Avatar + name ──────────────────────────────
          if (!auth.isAuthenticated)
            MouseRegion(
              onEnter: (_) => _closeAllMenus(),
              child: ElevatedButton(
                onPressed: () => context.push('/auth'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: _kGreen,
                  foregroundColor: _kLinen,
                  elevation: 0,
                  padding:
                      const EdgeInsets.symmetric(horizontal: 22, vertical: 12),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8)),
                ),
                child: Text('Sign In',
                    style: GoogleFonts.outfit(
                        fontSize: 14, fontWeight: FontWeight.w600)),
              ),
            )
          else
            _AvatarMenu(
              displayName: _displayName(auth.userEmail),
              menuController: _avatarController,
              onHoverOpen: () {
                _eventsController.close();
                _groupsController.close();
              },
              onLogout: () => ref.read(authProvider.notifier).logout(),
            ),
        ],
      ),
    );
  }
}

// ─── Nav item model ───────────────────────────────────────────────────────────

class _NavItem {
  final String emoji;
  final String label;
  final VoidCallback onTap;
  const _NavItem(this.emoji, this.label, this.onTap);
}

// ─── Nav dropdown ─────────────────────────────────────────────────────────────

class _NavDropdown extends StatelessWidget {
  final String label;
  final List<_NavItem> items;
  final MenuController menuController;
  final VoidCallback onHoverOpen;

  const _NavDropdown({
    required this.label,
    required this.items,
    required this.menuController,
    required this.onHoverOpen,
  });

  @override
  Widget build(BuildContext context) {
    return MenuAnchor(
      controller: menuController,
      style: MenuStyle(
        backgroundColor: WidgetStateProperty.all(_kLinen),
        elevation: WidgetStateProperty.all(12),
        shape: WidgetStateProperty.all(
          RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ),
        padding:
            WidgetStateProperty.all(const EdgeInsets.symmetric(vertical: 6)),
      ),
      menuChildren: items
          .map((item) => MenuItemButton(
                onPressed: item.onTap,
                style: _hoverMenuItemStyle(),
                child: Text(
                  '${item.emoji}   ${item.label}',
                  softWrap: false,
                  style: GoogleFonts.outfit(
                      fontSize: 14, fontWeight: FontWeight.w500),
                ),
              ))
          .toList(),
      builder: (context, controller, child) {
        return MouseRegion(
          onEnter: (_) {
            onHoverOpen();
            controller.open();
          },
          child: TextButton(
            onPressed: () =>
                controller.isOpen ? controller.close() : controller.open(),
            style: _hoverStyle(),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(label,
                    style: GoogleFonts.outfit(
                        fontSize: 15, fontWeight: FontWeight.w500)),
                const SizedBox(width: 2),
                const Icon(Icons.keyboard_arrow_down_rounded, size: 16),
              ],
            ),
          ),
        );
      },
    );
  }
}

// ─── Avatar + name + account dropdown ────────────────────────────────────────

class _AvatarMenu extends StatelessWidget {
  final String displayName;
  final VoidCallback onLogout;
  final MenuController menuController;
  final VoidCallback onHoverOpen;

  const _AvatarMenu({
    required this.displayName,
    required this.onLogout,
    required this.menuController,
    required this.onHoverOpen,
  });

  @override
  Widget build(BuildContext context) {
    return MenuAnchor(
      controller: menuController,
      alignmentOffset: const Offset(0, 0),
      style: MenuStyle(
        backgroundColor: WidgetStateProperty.all(_kLinen),
        elevation: WidgetStateProperty.all(12),
        shape: WidgetStateProperty.all(
          RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ),
        padding:
            WidgetStateProperty.all(const EdgeInsets.symmetric(vertical: 6)),
      ),
      menuChildren: [
        MenuItemButton(
          onPressed: () => context.push('/dashboard'),
          style: _hoverMenuItemStyle(),
          child: SizedBox(
            width: 100,
            child: Text('⚙️   Settings',
                style: GoogleFonts.outfit(
                    fontSize: 14, fontWeight: FontWeight.w500)),
          ),
        ),
        MenuItemButton(
          onPressed: onLogout,
          // Log Out defaults to green; turns linen on hover (on green bg)
          style: _hoverMenuItemStyle(defaultFg: _kGreen),
          child: SizedBox(
            width: 100,
            child: Text('🚪   Log Out',
                style: GoogleFonts.outfit(
                    fontSize: 14, fontWeight: FontWeight.w500)),
          ),
        ),
      ],
      builder: (context, controller, child) {
        return MouseRegion(
          onEnter: (_) {
            onHoverOpen();
            controller.open();
          },
          child: TextButton(
            onPressed: () =>
                controller.isOpen ? controller.close() : controller.open(),
            style: _hoverStyle(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (displayName.isNotEmpty) ...[
                  // No explicit color — inherits foregroundColor from _hoverStyle
                  Text(
                    displayName,
                    style: GoogleFonts.outfit(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(width: 8),
                ],
                Container(
                  width: 34,
                  height: 34,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: _kGreen.withValues(alpha: 0.08),
                    border: Border.all(
                        color: _kGreen.withValues(alpha: 0.35), width: 1.5),
                  ),
                  // No explicit color — inherits foregroundColor from _hoverStyle
                  child: const Icon(Icons.person_outline, size: 18),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
