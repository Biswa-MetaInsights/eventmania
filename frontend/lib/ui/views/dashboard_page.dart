import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:go_router/go_router.dart';
import 'package:eventmind_platform/api/api_client.dart';
import 'package:eventmind_platform/blocs/auth_provider.dart';

class DashboardPage extends ConsumerStatefulWidget {
  const DashboardPage({super.key});

  @override
  ConsumerState<DashboardPage> createState() => _DashboardPageState();
}

class _DashboardPageState extends ConsumerState<DashboardPage> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  List<dynamic> myTickets = [];
  Map<String, dynamic>? profile;
  bool isLoading = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadDashboardData();
  }

  Future<void> _loadDashboardData() async {
    // In a real app, user_id would come from auth state
    const userId = "00000000-0000-0000-0000-000000000001"; 
    
    try {
      final results = await Future.wait([
        ticketApi.get('/tickets/user/$userId'),
        userApi.get('/users/$userId'),
      ]);

      setState(() {
        myTickets = results[0].data.isNotEmpty ? results[0].data : [
          {
            "id": "mock-tick-1234",
            "event_id": "mock-event-9999",
            "qr_hash": "mockqrhashstring",
            "seat_info": "VIP Row A",
            "price_paid": 150.00,
          }
        ];
        
        profile = results[1].data;
        isLoading = false;
      });
    } catch (e) {
      debugPrint("Error loading dashboard, using mock data: $e");
      setState(() {
        myTickets = [
          {
            "id": "mock-tick-1234",
            "event_id": "mock-event-9999",
            "qr_hash": "mockqrhashstring",
            "seat_info": "VIP Row A",
            "price_paid": 150.00,
          }
        ];
        profile = {
          "id": userId,
          "username": "startup_founder",
          "full_name": "Demo User",
          "bio": "Building the future of event networking.",
          "interests": ["Technology", "AI", "Venture Capital"],
          "location_prefs": "San Francisco, CA"
        };
        isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (isLoading) return const Scaffold(body: Center(child: CircularProgressIndicator()));

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: Text("My Dashboard", style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
        actions: [
          TextButton.icon(
            onPressed: () => context.push('/organizer'),
            icon: const Icon(Icons.business_center_outlined, size: 18),
            label: const Text("Switch to Organizer"),
            style: TextButton.styleFrom(foregroundColor: Colors.indigo),
          ),
          const SizedBox(width: 16),
        ],
        bottom: TabBar(
          controller: _tabController,
          labelColor: Colors.indigo,
          unselectedLabelColor: Colors.grey,
          indicatorColor: Colors.indigo,
          tabs: const [Tab(text: "My Tickets"), Tab(text: "Networking Profile")],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildTicketsTab(),
          _buildProfileTab(),
        ],
      ),
    );
  }

  Widget _buildTicketsTab() {
    if (myTickets.isEmpty) {
      return Center(child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.confirmation_num_outlined, size: 80, color: Colors.grey),
          const SizedBox(height: 16),
          Text("No tickets found.", style: GoogleFonts.outfit(fontSize: 18, color: Colors.grey)),
        ],
      ));
    }

    return ListView.builder(
      padding: const EdgeInsets.all(40),
      itemCount: myTickets.length,
      itemBuilder: (context, index) {
        final ticket = myTickets[index];
        return _buildTicketCard(ticket);
      },
    );
  }

  Widget _buildTicketCard(Map<String, dynamic> ticket) {
    return Container(
      margin: const EdgeInsets.only(bottom: 32),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(24), border: Border.all(color: Colors.grey[200]!)),
      child: Row(
        children: [
          // QR Code Section
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(color: Colors.grey[50], borderRadius: const BorderRadius.only(topLeft: Radius.circular(24), bottomLeft: Radius.circular(24))),
            child: QrImageView(
              data: ticket['qr_hash'],
              version: QrVersions.auto,
              size: 150.0,
              gapless: false,
            ),
          ),
          // Event Info Section
          Expanded(
            child: Padding(
              padding: const EdgeInsets.all(32),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text("CONFIRMED TICKET #${ticket['id'].substring(0, 8).toUpperCase()}", style: GoogleFonts.outfit(color: Colors.green, fontWeight: FontWeight.bold, fontSize: 13)),
                  const SizedBox(height: 12),
                  Text("AI Summit 2026", style: GoogleFonts.outfit(fontSize: 24, fontWeight: FontWeight.bold)), // Mock event name
                  const SizedBox(height: 8),
                  Row(children: [
                    const Icon(Icons.calendar_today, size: 14, color: Colors.grey),
                    const SizedBox(width: 6),
                    Text("May 12, 2026 • 10:00 AM", style: GoogleFonts.outfit(color: Colors.grey)),
                  ]),
                  const SizedBox(height: 24),
                  Row(
                    children: [
                      ElevatedButton(
                        onPressed: () => context.push('/chat/${ticket['event_id']}?name=Event%20Chat'),
                        style: ElevatedButton.styleFrom(backgroundColor: Colors.indigo, foregroundColor: Colors.white, elevation: 0, padding: const EdgeInsets.symmetric(horizontal: 24)),
                        child: const Text("Join Community Chat"),
                      ),
                      const SizedBox(width: 12),
                      TextButton(
                        onPressed: () {},
                        child: const Text("Details"),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProfileTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(40),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(radius: 60, backgroundColor: Colors.indigo[50], child: const Icon(Icons.person, size: 60, color: Colors.indigo)),
              const SizedBox(width: 32),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(profile?['full_name'] ?? "User Name", style: GoogleFonts.outfit(fontSize: 32, fontWeight: FontWeight.bold)),
                  Text(profile?['email'] ?? "user@example.com", style: GoogleFonts.outfit(color: Colors.grey, fontSize: 18)),
                ],
              ),
            ],
          ),
          const Divider(height: 80),
          Text("My Networking Interests", style: GoogleFonts.outfit(fontSize: 24, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          Text("These interests power our AI Agent to match you with suitable event discovery and networking sessions.", style: GoogleFonts.outfit(color: Colors.grey)),
          const SizedBox(height: 32),
          Wrap(
            spacing: 12,
            runSpacing: 12,
            children: (profile?['interests'] as List<dynamic>? ?? ["AI", "Blockchain", "Web Design"]).map((interest) {
              return Chip(
                label: Text(interest),
                backgroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10), side: BorderSide(color: Colors.indigo.withOpacity(0.2))),
              );
            }).toList(),
          ),
          const SizedBox(height: 48),
          ElevatedButton(
            onPressed: () {},
            style: ElevatedButton.styleFrom(backgroundColor: Colors.indigo, foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 20), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16))),
            child: const Text("Update AI Profile"),
          ),
        ],
      ),
    );
  }
}
