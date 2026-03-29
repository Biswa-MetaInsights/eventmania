import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:go_router/go_router.dart';
import 'package:geolocator/geolocator.dart';
import 'package:eventmind_platform/blocs/event_provider.dart';
import 'package:eventmind_platform/blocs/auth_provider.dart';
import 'package:eventmind_platform/ui/components/event_card.dart';

class DiscoveryPage extends ConsumerStatefulWidget {
  const DiscoveryPage({super.key});

  @override
  ConsumerState<DiscoveryPage> createState() => _DiscoveryPageState();
}

class _DiscoveryPageState extends ConsumerState<DiscoveryPage> {
  final TextEditingController _searchController = TextEditingController();
  
  @override
  void initState() {
    super.initState();
    _initLocationAndFetchEvents();
  }

  Future<void> _initLocationAndFetchEvents() async {
    bool serviceEnabled;
    LocationPermission permission;

    // Test if location services are enabled.
    serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      _fetchEventsGlobal();
      return;
    }

    permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        _fetchEventsGlobal();
        return;
      }
    }
    
    if (permission == LocationPermission.deniedForever) {
      _fetchEventsGlobal();
      return;
    } 

    try {
      Position position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.low,
      );
      ref.read(eventProvider.notifier).fetchEvents(
        lat: position.latitude,
        lng: position.longitude,
      );
    } catch (e) {
      debugPrint("Geolocation error: $e");
      _fetchEventsGlobal();
    }
  }

  void _fetchEventsGlobal() {
    // Fallback: fetch without coordinates
    ref.read(eventProvider.notifier).fetchEvents();
  }

  @override
  Widget build(BuildContext context) {
    final eventState = ref.watch(eventProvider);
    final authState = ref.watch(authProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB), // Off-white
      body: CustomScrollView(
        slivers: [
          _buildHeroSection(context, ref, authState),
          _buildEventGrid(context, eventState),
          const SliverPadding(padding: EdgeInsets.only(bottom: 60)),
        ],
      ),
    );
  }

  Widget _buildHeroSection(BuildContext context, WidgetRef ref, AuthState auth) {
    return SliverToBoxAdapter(
      child: Container(
        height: 700,
        decoration: const BoxDecoration(
          color: Color(0xFFF3FAFA),
          image: DecorationImage(
            image: AssetImage('assets/images/banner.png'),
            fit: BoxFit.cover,
            opacity: 0.4,
          ),
        ),
        child: Stack(
          children: [
            // Floating Navbar on top of the banner
            Positioned(
              top: 32,
              left: 32,
              right: 32,
              child: Row(
                children: [
                  Container(
                    height: 240,
                    width: 240,
                    foregroundDecoration: const BoxDecoration(
                      backgroundBlendMode: BlendMode.multiply,
                      color: Colors.transparent,
                    ),
                    child: Image.asset('assets/images/logo.png', fit: BoxFit.contain),
                  ), // Massive logo natively blended over banner
                  const SizedBox(width: 32),
                  Text(
                    'EVENTMIND',
                    style: GoogleFonts.outfit(fontSize: 64, fontWeight: FontWeight.w900, color: const Color(0xFF111827), letterSpacing: 2.0),
                  ),
                  const Spacer(),
                  if (!auth.isAuthenticated)
                    ElevatedButton(
                      onPressed: () => context.push('/auth'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF0D9488),
                        foregroundColor: Colors.white,
                        elevation: 0,
                        padding: const EdgeInsets.symmetric(horizontal: 56, vertical: 28),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      ),
                      child: Text('Sign In', style: GoogleFonts.outfit(fontSize: 28, fontWeight: FontWeight.bold)),
                    )
                  else
                    IconButton(
                      onPressed: () => context.push('/dashboard'), 
                      icon: const Icon(Icons.account_circle_outlined, size: 48, color: Color(0xFF0D9488))
                    ),
                ],
              ),
            ),
            // Light graphic elements (Turquoise circles)
            Positioned(
              top: -50,
              left: -50,
              child: Container(
                width: 200,
                height: 200,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: const Color(0xFF0D9488).withOpacity(0.05),
                ),
              ),
            ),
            Positioned(
              bottom: -100,
              right: 100,
              child: Container(
                width: 300,
                height: 300,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: const Color(0xFF0D9488).withOpacity(0.08),
                ),
              ),
            ),
            // Main content
            Padding(
              padding: const EdgeInsets.all(40.0),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Text(
                    'Experience the Extraordinary.',
                    textAlign: TextAlign.center,
                    style: GoogleFonts.outfit(
                      fontSize: 56,
                      fontWeight: FontWeight.w800,
                      color: const Color(0xFF111827), // Dark text for light background
                      height: 1.1,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'AI-powered events & networking summits around your city.',
                    textAlign: TextAlign.center,
                    style: GoogleFonts.outfit(
                      fontSize: 20,
                      color: const Color(0xFF4B5563),
                    ),
                  ),
                  const SizedBox(height: 48),
                  
                  // Search Bar
                  Center(
                    child: Container(
                      constraints: const BoxConstraints(maxWidth: 680),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: const Color(0xFFE5E7EB)),
                        boxShadow: [
                          BoxShadow(
                            color: const Color(0xFF0D9488).withOpacity(0.05),
                            blurRadius: 20,
                            offset: const Offset(0, 10),
                          ),
                        ],
                      ),
                      padding: const EdgeInsets.symmetric(horizontal: 24),
                      child: TextField(
                        controller: _searchController,
                        onChanged: (val) {
                          // Quick local search trigger could go here
                          ref.read(eventProvider.notifier).fetchEvents(query: val);
                        },
                        decoration: InputDecoration(
                          hintText: 'Search coding bootcamps, AI summits, or design workshops...',
                          hintStyle: GoogleFonts.outfit(color: Colors.grey[400]),
                          border: InputBorder.none,
                          icon: const Icon(Icons.search, color: Color(0xFF0D9488)),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            
            // "Events Near You" pinned onto the background banner
            Positioned(
              bottom: 40,
              left: 40,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.85),
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: [
                    BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, 4))
                  ],
                ),
                child: Text(
                  "Events Near You (20km radius)",
                  style: GoogleFonts.outfit(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: const Color(0xFF111827),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionHeader(BuildContext context, String title) {
    return SliverToBoxAdapter(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(40, 48, 40, 24),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(title, style: GoogleFonts.outfit(fontSize: 28, fontWeight: FontWeight.bold, color: const Color(0xFF1F2937))),
            TextButton(
              onPressed: () {},
              child: Text('View All', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, color: const Color(0xFF0D9488))),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEventGrid(BuildContext context, EventState state) {
    if (state.isLoading) {
      return const SliverToBoxAdapter(child: Center(child: Padding(padding: EdgeInsets.all(100.0), child: CircularProgressIndicator(color: Color(0xFF0D9488)))));
    }

    if (state.events.isEmpty) {
      return SliverToBoxAdapter(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(100.0),
            child: Text('No events found near you. Try searching globally.', style: GoogleFonts.outfit(color: Colors.grey, fontSize: 16)),
          ),
        ),
      );
    }

    return SliverPadding(
      padding: const EdgeInsets.symmetric(horizontal: 40),
      sliver: SliverGrid(
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 3,
          crossAxisSpacing: 24,
          mainAxisSpacing: 24,
          childAspectRatio: 0.85,
        ),
        delegate: SliverChildBuilderDelegate(
          (context, index) {
            final event = state.events[index];
            return EventCard(
              event: event,
              onTap: () {
                final id = event['id'];
                GoRouter.of(context).push('/event/$id');
              },
            );
          },
          childCount: state.events.length,
        ),
      ),
    );
  }
}
