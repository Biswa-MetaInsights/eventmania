import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:go_router/go_router.dart';
import '../../api/api_client.dart';
import '../../blocs/auth_provider.dart';

class OrganizerDashboardPage extends ConsumerStatefulWidget {
  const OrganizerDashboardPage({super.key});

  @override
  ConsumerState<OrganizerDashboardPage> createState() => _OrganizerDashboardPageState();
}

class _OrganizerDashboardPageState extends ConsumerState<OrganizerDashboardPage> {
  List<dynamic> myEvents = [];
  bool isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadMyEvents();
  }

  Future<void> _loadMyEvents() async {
    // In a real app, organizer_id would come from auth state
    const organizerId = "00000000-0000-0000-0000-000000000001";
    
    try {
      final response = await eventApi.get('/events/organizer/$organizerId');
      setState(() {
        myEvents = response.data;
        isLoading = false;
      });
    } catch (e) {
      debugPrint("Error loading organized events: $e");
      setState(() => isLoading = false);
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
        title: Text("Organizer Console", style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
        actions: [
          ElevatedButton.icon(
            onPressed: () => _showCreateEventDialog(context),
            icon: const Icon(Icons.add, size: 18),
            label: Text("Create New Event", style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.indigo, foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
          ),
          const SizedBox(width: 24),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(40),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildAnalyticsSummary(),
            const SizedBox(height: 48),
            Text("Your Managed Events", style: GoogleFonts.outfit(fontSize: 24, fontWeight: FontWeight.bold)),
            const SizedBox(height: 24),
            _buildEventsTable(),
          ],
        ),
      ),
    );
  }

  Widget _buildAnalyticsSummary() {
    return Row(
      children: [
        _buildStatCard("Total Revenue", "\$12,450", Icons.attach_money, Colors.green),
        const SizedBox(width: 24),
        _buildStatCard("Total Attendees", "1,240", Icons.people_outline, Colors.blue),
        const SizedBox(width: 24),
        _buildStatCard("Active Events", myEvents.length.toString(), Icons.event_available, Colors.indigo),
      ],
    );
  }

  Widget _buildStatCard(String label, String value, IconData icon, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(32),
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(24), border: Border.all(color: Colors.grey[100]!)),
        child: Row(
          children: [
            Container(padding: const EdgeInsets.all(16), decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(16)), child: Icon(icon, color: color, size: 32)),
            const SizedBox(width: 24),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: GoogleFonts.outfit(color: Colors.grey[500], fontSize: 14)),
                const SizedBox(height: 4),
                Text(value, style: GoogleFonts.outfit(fontSize: 32, fontWeight: FontWeight.bold)),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEventsTable() {
    if (myEvents.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(60),
        width: double.infinity,
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(24)),
        child: Center(child: Text("You haven't created any events yet.", style: GoogleFonts.outfit(color: Colors.grey))),
      );
    }

    return Container(
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(24), border: Border.all(color: Colors.grey[100]!)),
      child: DataTable(
        columnSpacing: 40,
        headingTextStyle: GoogleFonts.outfit(fontWeight: FontWeight.bold, color: Colors.grey[600]),
        columns: const [
          DataColumn(label: Text("EVENT NAME")),
          DataColumn(label: Text("DATE")),
          DataColumn(label: Text("STATUS")),
          DataColumn(label: Text("SALES")),
          DataColumn(label: Text("REVENUE")),
          DataColumn(label: Text("ACTIONS")),
        ],
        rows: myEvents.map((event) {
          final startDate = DateTime.parse(event['start_date']);
          return DataRow(cells: [
            DataCell(Text(event['title'], style: const TextStyle(fontWeight: FontWeight.bold))),
            DataCell(Text(DateFormat('MMM d, y').format(startDate))),
            DataCell(_buildStatusBadge(event['status'])),
            DataCell(const Text("120 / 300")), // Mock sales ratio
            DataCell(Text("\$${(event['price'] * 120).toStringAsFixed(2)}")),
            DataCell(Row(children: [
              IconButton(onPressed: () {}, icon: const Icon(Icons.edit_outlined, size: 20)),
              IconButton(onPressed: () {}, icon: const Icon(Icons.analytics_outlined, size: 20)),
            ])),
          ]);
        }).toList(),
      ),
    );
  }

  Widget _buildStatusBadge(String status) {
    final color = status == 'published' ? Colors.green : Colors.orange;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(8)),
      child: Text(status.toUpperCase(), style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.bold)),
    );
  }

  void _showCreateEventDialog(BuildContext context) {
    context.push('/organizer/create');
  }
}
