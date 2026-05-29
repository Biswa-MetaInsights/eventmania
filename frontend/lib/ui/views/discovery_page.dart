import 'dart:async';
import 'dart:math';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:go_router/go_router.dart';
import 'package:geolocator/geolocator.dart';
import 'package:eventmind_platform/blocs/event_provider.dart';
import 'package:eventmind_platform/ui/components/event_card.dart';
import 'package:eventmind_platform/ui/components/event_navbar.dart';

const _kGreen = Color(0xFF184E4A);
const _kBg    = Color(0xFFF2EFEA);

// ─── Discovery page ───────────────────────────────────────────────────────────

class DiscoveryPage extends ConsumerStatefulWidget {
  const DiscoveryPage({super.key});
  @override
  ConsumerState<DiscoveryPage> createState() => _DiscoveryPageState();
}

class _DiscoveryPageState extends ConsumerState<DiscoveryPage> {
  @override
  void initState() {
    super.initState();
    _initLocationAndFetchEvents();
  }

  Future<void> _initLocationAndFetchEvents() async {
    final serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) { _fetchEventsGlobal(); return; }

    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) { _fetchEventsGlobal(); return; }
    }
    if (permission == LocationPermission.deniedForever) { _fetchEventsGlobal(); return; }

    try {
      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.low),
      );
      if (!mounted) return;
      ref.read(eventProvider.notifier).fetchEvents(lat: pos.latitude, lng: pos.longitude);
    } catch (_) {
      _fetchEventsGlobal();
    }
  }

  void _fetchEventsGlobal() {
    if (mounted) ref.read(eventProvider.notifier).fetchEvents();
  }

  @override
  Widget build(BuildContext context) {
    final eventState = ref.watch(eventProvider);
    return Scaffold(
      backgroundColor: _kBg,
      body: CustomScrollView(
        slivers: [
          const SliverPersistentHeader(pinned: true, delegate: _StickyNavDelegate()),
          const SliverToBoxAdapter(child: _DiagonalHeroCarousel()),
          _buildSectionHeader(),
          _buildEventGrid(context, eventState),
          const SliverPadding(padding: EdgeInsets.only(bottom: 80)),
        ],
      ),
    );
  }

  Widget _buildSectionHeader() {
    return SliverToBoxAdapter(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(48, 32, 48, 28),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('Upcoming Events',
                  style: GoogleFonts.outfit(
                      fontSize: 26, fontWeight: FontWeight.w800,
                      color: const Color(0xFF111827), letterSpacing: -0.5)),
              const SizedBox(height: 4),
              Text("Discover what's happening around you",
                  style: GoogleFonts.outfit(fontSize: 14, color: const Color(0xFF6B7280))),
            ]),
            const Spacer(),
            TextButton.icon(
              onPressed: () {},
              icon: const Icon(Icons.arrow_forward, size: 15, color: _kGreen),
              label: Text('View All',
                  style: GoogleFonts.outfit(
                      fontWeight: FontWeight.w600, color: _kGreen, fontSize: 14)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEventGrid(BuildContext context, EventState state) {
    if (state.isLoading) {
      return const SliverToBoxAdapter(
        child: Center(child: Padding(
          padding: EdgeInsets.all(100),
          child: CircularProgressIndicator(color: _kGreen),
        )),
      );
    }
    if (state.events.isEmpty) {
      return SliverToBoxAdapter(
        child: Center(child: Padding(
          padding: const EdgeInsets.all(80),
          child: Column(children: [
            Icon(Icons.search_off_rounded, size: 48, color: Colors.grey[300]),
            const SizedBox(height: 16),
            Text('No events found. Try searching above.',
                style: GoogleFonts.outfit(color: const Color(0xFF94A3B8), fontSize: 16)),
          ]),
        )),
      );
    }
    return SliverPadding(
      padding: const EdgeInsets.symmetric(horizontal: 48),
      sliver: SliverGrid(
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 3, crossAxisSpacing: 24,
          mainAxisSpacing: 24,  childAspectRatio: 0.82,
        ),
        delegate: SliverChildBuilderDelegate(
          (context, i) {
            final event = state.events[i];
            return EventCard(
              event: event,
              onTap: () => GoRouter.of(context).push('/event/${event['id']}'),
            );
          },
          childCount: state.events.length,
        ),
      ),
    );
  }
}

// ─── Diagonal crossfade hero carousel ────────────────────────────────────────
//
// Outgoing image: static underneath, no animation.
// Incoming image: revealed by an animated ShaderMask — a linear gradient at
// 15° whose left-edge sweeps from -softW to +width over 1.5 s ease-in-out,
// creating a diagonal wipe from left to right.

class _DiagonalHeroCarousel extends StatefulWidget {
  const _DiagonalHeroCarousel();
  @override
  State<_DiagonalHeroCarousel> createState() => _DiagonalHeroCarouselState();
}

class _DiagonalHeroCarouselState extends State<_DiagonalHeroCarousel>
    with SingleTickerProviderStateMixin {

  static const _images = [
    'assets/images/hero1.jpg',
    'assets/images/hero2.jpg',
    'assets/images/hero3.jpg',
    'assets/images/hero4.jpg',
  ];
  static const _heroH = 560.0;

  int  _current   = 0;
  int  _next      = 1;
  bool _animating = false;
  late final AnimationController _ctrl;
  late final Animation<double>   _anim;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    );
    _anim = CurvedAnimation(parent: _ctrl, curve: Curves.easeInOut);
    _ctrl.addStatusListener((s) {
      if (s == AnimationStatus.completed && mounted) {
        setState(() { _current = _next; _animating = false; });
        _ctrl.reset();
      }
    });
    _timer = Timer.periodic(const Duration(seconds: 4), (_) => _advance());
  }

  void _advance() {
    if (_animating || !mounted) return;
    setState(() { _next = (_current + 1) % _images.length; _animating = true; });
    _ctrl.forward(from: 0);
  }

  void _goTo(int index) {
    if (_animating || index == _current) return;
    _timer?.cancel();
    setState(() { _next = index; _animating = true; });
    _ctrl.forward(from: 0);
    _timer = Timer.periodic(const Duration(seconds: 4), (_) => _advance());
  }

  @override
  void dispose() {
    _timer?.cancel();
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _anim,
      builder: (context, _) {
        final t = _anim.value;

        return SizedBox(
          height: _heroH,
          child: ClipRect(
            child: Stack(
              fit: StackFit.expand,
              children: [

                // ── Outgoing image — completely static ───────────────
                Image.asset(_images[_current], fit: BoxFit.cover),

                // ── Incoming image — diagonal mask reveal ────────────
                if (_animating)
                  ShaderMask(
                    blendMode: BlendMode.dstIn,
                    shaderCallback: (bounds) {
                      final w = bounds.width;
                      final h = bounds.height;

                      // Soft-edge width ≈ 22 % of image width
                      final softW = w * 0.22;

                      // gx = left edge of the gradient strip
                      //   t=0 → gx = -softW  (strip fully off-screen left  → image hidden)
                      //   t=1 → gx =  w      (strip fully off-screen right → image visible)
                      final gx = t * (w + softW) - softW;

                      // 15° diagonal tilt on the gradient axis
                      // dy = vertical travel of the gradient across softW pixels
                      final dy = softW * tan(15.0 * pi / 180.0);

                      // Gradient: black (opaque) → transparent
                      // Pixels left  of the strip → extrapolated as black  → shown
                      // Pixels right of the strip → extrapolated as clear  → hidden
                      return ui.Gradient.linear(
                        Offset(gx,          h * 0.5 + dy * 0.5), // left edge,  lower
                        Offset(gx + softW,  h * 0.5 - dy * 0.5), // right edge, higher
                        [Colors.black, Colors.transparent],
                      );
                    },
                    child: Image.asset(_images[_next], fit: BoxFit.cover),
                  ),

                // ── Subtle left-side gradient for text legibility ────
                Positioned.fill(
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.centerLeft,
                        end: Alignment.centerRight,
                        colors: [
                          Colors.black.withValues(alpha: 0.55),
                          Colors.black.withValues(alpha: 0.15),
                          Colors.transparent,
                        ],
                        stops: const [0.0, 0.40, 0.75],
                      ),
                    ),
                  ),
                ),

                // ── Bottom fade into page background ─────────────────
                Positioned(
                  bottom: 0, left: 0, right: 0, height: 100,
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          Colors.transparent,
                          _kBg.withValues(alpha: 0.9),
                        ],
                      ),
                    ),
                  ),
                ),

                // ── Text overlay (left-aligned) ───────────────────────
                Positioned(
                  left: 64, top: 0, bottom: 60, width: 520,
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Badge pill
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 14, vertical: 6),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.10),
                          borderRadius: BorderRadius.circular(100),
                          border: Border.all(
                              color: Colors.white.withValues(alpha: 0.22)),
                        ),
                        child: Text(
                          '✦  AI-Powered Event Discovery',
                          style: GoogleFonts.outfit(
                            color: Colors.white,
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            letterSpacing: 0.3,
                          ),
                        ),
                      ),
                      const SizedBox(height: 22),
                      Text(
                        'Experience the\nExtraordinary.',
                        style: GoogleFonts.outfit(
                          fontSize: 58,
                          fontWeight: FontWeight.w800,
                          color: Colors.white,
                          height: 1.08,
                          letterSpacing: -1.0,
                        ),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'Discover events, summits & networking\nnear you — curated by AI.',
                        style: GoogleFonts.outfit(
                          fontSize: 16,
                          color: Colors.white.withValues(alpha: 0.75),
                          fontWeight: FontWeight.w400,
                          height: 1.6,
                        ),
                      ),
                    ],
                  ),
                ),

                // ── Navigation dots (bottom-center) ──────────────────
                Positioned(
                  bottom: 24, left: 0, right: 0,
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(_images.length, (i) {
                      final active = _animating
                          ? (t > 0.5 ? i == _next : i == _current)
                          : i == _current;
                      return GestureDetector(
                        onTap: () => _goTo(i),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 350),
                          margin: const EdgeInsets.symmetric(horizontal: 4),
                          width:  active ? 28.0 : 8.0,
                          height: 4.0,
                          decoration: BoxDecoration(
                            color: active
                                ? Colors.white
                                : Colors.white.withValues(alpha: 0.35),
                            borderRadius: BorderRadius.circular(2),
                          ),
                        ),
                      );
                    }),
                  ),
                ),

              ],
            ),
          ),
        );
      },
    );
  }
}

// ─── Sticky navbar delegate ───────────────────────────────────────────────────

class _StickyNavDelegate extends SliverPersistentHeaderDelegate {
  const _StickyNavDelegate();
  @override double get minExtent => 72;
  @override double get maxExtent => 72;
  @override Widget build(
      BuildContext context, double shrinkOffset, bool overlapsContent) =>
      const EventNavbar();
  @override bool shouldRebuild(covariant SliverPersistentHeaderDelegate _) => true;
}
