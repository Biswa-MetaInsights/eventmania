import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:go_router/go_router.dart';
import 'package:eventmind_platform/blocs/auth_provider.dart';

class AuthPage extends ConsumerStatefulWidget {
  final bool isLogin;
  const AuthPage({super.key, this.isLogin = true});

  @override
  ConsumerState<AuthPage> createState() => _AuthPageState();
}

class _AuthPageState extends ConsumerState<AuthPage> {
  late bool _isLoginMode;
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _nameController = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  @override
  void initState() {
    super.initState();
    _isLoginMode = widget.isLogin;
  }

  Future<void> _handleAuth() async {
    if (!_formKey.currentState!.validate()) return;

    final authNotifier = ref.read(authProvider.notifier);
    bool success = false;

    if (_isLoginMode) {
      success = await authNotifier.login(
        _emailController.text,
        _passwordController.text,
      );
    } else {
      // For registration, we'd call a registration method in AuthNotifier
      // Mocking success for demo
      success = await authNotifier.login(
        _emailController.text,
        _passwordController.text,
      );
    }

    if (success && mounted) {
      context.go('/');
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: Row(
        children: [
          // Left Side: Image/Info (Hidden on small screens)
          if (MediaQuery.of(context).size.width > 900)
            Expanded(
              flex: 1,
              child: Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Color(0xFFF3FAFA), Color(0xFFE5F6F6)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(60.0),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        height: 400,
                        width: 400,
                        foregroundDecoration: const BoxDecoration(
                          backgroundBlendMode: BlendMode.multiply,
                          color: Colors.transparent,
                        ),
                        child: Image.asset('assets/images/logo.png', fit: BoxFit.contain),
                      ),
                      const SizedBox(height: 32),
                      Text(
                        'Unlock Your Next\nGreat Experience.',
                        style: GoogleFonts.outfit(
                          fontSize: 56,
                          fontWeight: FontWeight.w800,
                          color: const Color(0xFF111827),
                          height: 1.1,
                        ),
                      ),
                      const SizedBox(height: 24),
                      Text(
                        'Join thousands of attendees discovering AI summits, tech workshops, and networking events daily.',
                        style: GoogleFonts.outfit(
                          fontSize: 20,
                          color: const Color(0xFF4B5563),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          
          // Right Side: Auth Form
          Expanded(
            flex: 1,
            child: SingleChildScrollView(
              child: Padding(
                padding: const EdgeInsets.all(80.0),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        _isLoginMode ? 'Welcome Back' : 'Create Account',
                        style: GoogleFonts.outfit(fontSize: 32, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        _isLoginMode 
                          ? 'Sign in to access your dashboard and event tickets.' 
                          : 'Join the EventMind community to start your journey.',
                        style: GoogleFonts.outfit(color: Colors.grey[600], fontSize: 16),
                      ),
                      const SizedBox(height: 48),

                      if (!_isLoginMode) ...[
                        _buildInputField('Full Name', _nameController, Icons.person_outline),
                        const SizedBox(height: 24),
                      ],
                      
                      _buildInputField('Email Address', _emailController, Icons.email_outlined),
                      const SizedBox(height: 24),
                      _buildInputField('Password', _passwordController, Icons.lock_outline, isPassword: true),
                      
                      const SizedBox(height: 40),
                      
                      if (authState.errorMessage != null)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 24),
                          child: Text(
                            authState.errorMessage!,
                            style: const TextStyle(color: Colors.redAccent),
                          ),
                        ),

                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: authState.isLoading ? null : _handleAuth,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF0D9488),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 24),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                          ),
                          child: authState.isLoading
                            ? const CircularProgressIndicator(color: Colors.white)
                            : Text(
                                _isLoginMode ? 'Sign In' : 'Sign Up',
                                style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold),
                              ),
                        ),
                      ),
                      
                      const SizedBox(height: 32),
                      Center(
                        child: TextButton(
                          onPressed: () => setState(() => _isLoginMode = !_isLoginMode),
                          child: Text(
                            _isLoginMode ? "Don't have an account? Sign Up" : "Already have an account? Sign In",
                            style: GoogleFonts.outfit(color: Colors.grey[700], fontWeight: FontWeight.w600),
                          ),
                        ),
                      ),
                      
                      const SizedBox(height: 32),
                      Row(
                        children: [
                          Expanded(child: Divider(color: Colors.grey[300])),
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            child: Text('OR', style: GoogleFonts.outfit(color: Colors.grey, fontWeight: FontWeight.w600)),
                          ),
                          Expanded(child: Divider(color: Colors.grey[300])),
                        ],
                      ),
                      const SizedBox(height: 32),
                      
                      _buildSocialButton('Continue with Gmail', Icons.mail_outline, const Color(0xFFDB4437)),
                      _buildSocialButton('Continue with Apple', Icons.apple, Colors.black),
                      _buildSocialButton('Continue with Facebook', Icons.facebook, const Color(0xFF1877F2)),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInputField(String label, TextEditingController controller, IconData icon, {bool isPassword = false}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 14)),
        const SizedBox(height: 8),
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.grey[200]!),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: TextFormField(
            controller: controller,
            obscureText: isPassword,
            decoration: InputDecoration(
              border: InputBorder.none,
              icon: Icon(icon, size: 20, color: Colors.grey),
            ),
            validator: (value) {
              if (value == null || value.isEmpty) return 'This field is required';
              return null;
            },
          ),
        ),
      ],
    );
  }

  Widget _buildSocialButton(String text, IconData icon, Color color) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      width: double.infinity,
      child: OutlinedButton.icon(
        onPressed: () {},
        icon: Icon(icon, color: color, size: 24),
        label: Text(text, style: GoogleFonts.outfit(fontSize: 16, color: Colors.black87, fontWeight: FontWeight.w600)),
        style: OutlinedButton.styleFrom(
          padding: const EdgeInsets.symmetric(vertical: 20),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          side: BorderSide(color: Colors.grey[300]!),
        ),
      ),
    );
  }
}
