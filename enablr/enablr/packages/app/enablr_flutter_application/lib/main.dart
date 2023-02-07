import 'dart:convert';

import 'package:enablr_flutter_application/settings.dart';
import 'package:flutter/material.dart';
import 'consts.dart';
import 'qrScanner.dart';
import 'individual.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  // This widget is the root of your application.
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Flutter Demo',
      theme: ThemeData(
        primarySwatch: Colors.blue,
      ),
      home: const MyHomePage(title: 'Flutter Demo Home Page'),
      scrollBehavior: const MaterialScrollBehavior(),
    );
  }
}

class MyHomePage extends StatefulWidget {
  const MyHomePage({super.key, required this.title});

  final String title;

  @override
  State<MyHomePage> createState() => MyHomePageState();
}

class MyHomePageState extends State<MyHomePage> {
  var _selectedIndex = 0;
  var _tokens = [];
  var _individuals = [];
  var _storageTokensLoaded = false;

  void _setSelectedIndex(value) {
    setState(() {
      _selectedIndex = value;
    });
  }

  void _addIndividual(token, String? individualId) async {
    var response = await http.get(Uri.parse('$apiURL/prod/device/individual'),
        headers: {'Authorization': 'Bearer $token'});

    if (response.body == "Revoked" && individualId != null) {
      return _removeIndividual({"individualId": individualId});
    }
    var jsonResponse = jsonDecode(response.body);

    if (response.statusCode == 200) {
      // Dont duplicate individuals
      if (_individuals.firstWhere(
              (ind) => ind['individual_id'] == jsonResponse['individual_id'],
              orElse: () => null) ==
          null) {
        setState(() {
          _individuals.add(jsonResponse);
          _selectedIndex = _individuals.length - 1;
          if (_tokens.firstWhere(
                  (tok) => tok['individualId'] == jsonResponse['individual_id'],
                  orElse: () => null) ==
              null) {
            _tokens.add({
              "token": token,
              "individualId": jsonResponse['individual_id']
            });
          }
        });
        _addTokensToSP(_tokens);
      }
    } else {
      print(jsonResponse);
    }
  }

  void _removeIndividual(token) {
    setState(() {
      _tokens
          .removeWhere((tok) => tok['individualId'] == token['individualId']);
      _individuals
          .removeWhere((ind) => ind['individual_id'] == token['individualId']);
      _selectedIndex = _individuals.length + 1;
    });
  }

  _loadTokensFromSP() async {
    SharedPreferences prefs = await SharedPreferences.getInstance();

    var tokens =
        prefs.getStringList('tokens')?.map((token) => jsonDecode(token)) ?? [];

    setState(() {
      _tokens = tokens.toList();
    });

    for (var token in tokens) {
      _addIndividual(token['token'], token['individualId']);
    }
  }

  _addTokensToSP(List<dynamic> tokens) async {
    SharedPreferences prefs = await SharedPreferences.getInstance();

    prefs.setStringList(
        'tokens', tokens.map((token) => jsonEncode(token)).toList());
  }

  _revokedCallback(String individualId) {
    _removeIndividual({"individualId": individualId});
    setState(() {
      _selectedIndex = 0;
    });
  }

  @override
  Widget build(BuildContext context) {
    Widget page;

    if (!_storageTokensLoaded) {
      _loadTokensFromSP();
      setState(() {
        _storageTokensLoaded = true;
      });
    }

    if (_selectedIndex == _individuals.length) {
      page = QRPage(title: 'Register new Individual', callback: _addIndividual);
    } else if (_selectedIndex > _individuals.length) {
      page = SettingsPage(
          tokens: _tokens,
          individuals: _individuals,
          removeCallback: _removeIndividual);
    } else {
      page = IndividualPage(
          individual: _individuals[_selectedIndex],
          token: _tokens[_selectedIndex]["token"],
          revokedCallback: _revokedCallback);
    }

    var tabs = _individuals.map((i) {
      Map<String, dynamic> details = i['details'] as Map<String, dynamic>;
      return NavigationRailDestination(
        icon: Icon(Icons.face),
        label: Text(details['firstName'] as String),
      );
    }).toList();

    tabs.add(const NavigationRailDestination(
      icon: Icon(Icons.add_outlined),
      label: Text('Favorites'),
    ));

    tabs.add(const NavigationRailDestination(
      icon: Icon(Icons.settings),
      label: Text('Settings'),
    ));

    return LayoutBuilder(builder: (context, constraints) {
      return Scaffold(
        body: Row(
          children: [
            SafeArea(
              child: NavigationRail(
                extended: constraints.maxWidth >= 600,
                destinations: tabs,
                selectedIndex: _selectedIndex,
                onDestinationSelected: (value) {
                  _setSelectedIndex(value);
                },
              ),
            ),
            Expanded(
              child: Container(
                color: Theme.of(context).colorScheme.primaryContainer,
                child: page,
              ),
            ),
          ],
        ),
      );
    });
  }
}
