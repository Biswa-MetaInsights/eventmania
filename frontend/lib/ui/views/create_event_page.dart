import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:go_router/go_router.dart';
import '../../api/api_client.dart';
import '../../blocs/auth_provider.dart';

class CreateEventPage extends ConsumerStatefulWidget {
  const CreateEventPage({super.key});

  @override
  ConsumerState<CreateEventPage> createState() => _CreateEventPageState();
}

class _CreateEventPageState extends ConsumerState<CreateEventPage> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descController = TextEditingController();
  final _locationController = TextEditingController();
  final _priceController = TextEditingController();
  String _selectedCategory = "Technology";
  bool isSubmitting = false;

  final List<String> categories = ["Technology", "Creative", "Business", "Summit", "Networking"];

  Future<void> _publishEvent() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => isSubmitting = true);

    try {
      final response = await eventApi.post('/events/', data: {
        'title': _titleController.text,
        'description': _descController.text,
        'category': _selectedCategory,
        'location': {'address': _locationController.text, 'latitude': 0.0, 'longitude': 0.0},
        'status': 'published',
        'price': double.parse(_priceController.text),
        'start_date': DateTime.now().add(const Duration(days: 30)).toIso8601String(),
        'end_date': DateTime.now().add(const Duration(days: 31)).toIso8601String(),
        'organizer_id': '00000000-0000-0000-0000-000000000001' // Mock ID
      });

      if (response.statusCode == 201) {
        if (mounted) {
          _showSuccessAndRedirect();
        }
      }
    } catch (e) {
      debugPrint("Event Creation Error: $e");
      setState(() => isSubmitting = false);
    }
  }

  void _showSuccessAndRedirect() {
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Event Published Successfully!"), backgroundColor: Colors.green));
    context.go('/organizer');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: Text("Publish New Event", style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white, elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 100, vertical: 40),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
               Text("Event Basics", style: GoogleFonts.outfit(fontSize: 24, fontWeight: FontWeight.bold)),
               const SizedBox(height: 32),
               _buildInputField("Event Title", _titleController, Icons.title, "e.g., Biswa AI Summit 2026"),
               const SizedBox(height: 24),
               _buildCategorySelector(),
               const SizedBox(height: 24),
               _buildInputField("Description", _descController, Icons.description, "What is this event about?", maxLines: 5),
               const SizedBox(height: 48),
               Text("Time & Location", style: GoogleFonts.outfit(fontSize: 24, fontWeight: FontWeight.bold)),
               const SizedBox(height: 32),
               _buildInputField("Venue Address", _locationController, Icons.place, "e.g., 123 Tech Lane, San Francisco"),
               const SizedBox(height: 48),
               Text("Ticket Pricing", style: GoogleFonts.outfit(fontSize: 24, fontWeight: FontWeight.bold)),
               const SizedBox(height: 32),
               _buildInputField("Price (USD)", _priceController, Icons.attach_money, "0.00 for FREE events", isNumber: true),
               const SizedBox(height: 60),
               SizedBox(
                 width: double.infinity,
                 child: ElevatedButton(
                   onPressed: isSubmitting ? null : _publishEvent,
                   style: ElevatedButton.styleFrom(backgroundColor: Colors.indigo, foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(vertical: 24), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16))),
                   child: isSubmitting 
                     ? const CircularProgressIndicator(color: Colors.white)
                     : Text("Publish Event Now", style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold)),
                 ),
               ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildInputField(String label, TextEditingController controller, IconData icon, String hint, {int maxLines = 1, bool isNumber = false}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 14)),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.grey[200]!)),
          child: TextFormField(
            controller: controller,
            maxLines: maxLines,
            keyboardType: isNumber ? TextInputType.number : TextInputType.text,
            decoration: InputDecoration(hintText: hint, border: InputBorder.none, icon: Icon(icon, size: 20, color: Colors.grey)),
            validator: (v) => v!.isEmpty ? "Required" : null,
          ),
        ),
      ],
    );
  }

  Widget _buildCategorySelector() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text("Category", style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 14)),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.grey[200]!)),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              isExpanded: true,
              value: _selectedCategory,
              onChanged: (v) => setState(() => _selectedCategory = v!),
              items: categories.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
            ),
          ),
        ),
      ],
    );
  }
}
