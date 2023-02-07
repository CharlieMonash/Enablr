import 'dart:io';

import 'package:flutter/material.dart';

import 'package:device_info_plus/device_info_plus.dart';

import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

class SettingsPage extends StatefulWidget {
  const SettingsPage(
      {super.key,
      required this.tokens,
      required this.individuals,
      required this.removeCallback});

  final List<dynamic> tokens;
  final List<dynamic> individuals;
  final Function removeCallback;

  @override
  State<SettingsPage> createState() => SettingsPageState();
}

class SettingsPageState extends State<SettingsPage> {
  @override
  Widget build(BuildContext context) {
    var index = widget.tokens.length;
    var individualRows = [];
    for (var token in widget.tokens) {
      var individual = widget.individuals.firstWhere(
          (ind) => ind['individual_id'] == token["individualId"],
          orElse: () => null);
      var firstName =
          individual != null ? individual['details']['firstName'] : 'unknown';
      var lastName =
          individual != null ? individual['details']['lastName'] : 'delete';

      individualRows.add(SizedBox(
          child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: <Widget>[
          Text(
            'Remove $firstName $lastName',
          ),
          ElevatedButton(
            onPressed: () => widget.removeCallback(token),
            child: Text(
              'Remove',
            ),
          )
        ],
      )));
    }

    return Scaffold(
      appBar: AppBar(
        // Here we take the value from the MyHomePage object that was created by
        // the App.build method, and use it to set our appbar title.
        title: const Text("App settings page"),
      ),
      body: Center(
        // Center is a layout widget. It takes a single child and positions it
        // in the middle of the parent.
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: <Widget>[
            const Text(
              'Remove linked users here',
            ),
            const SizedBox(height: 30),
            ...individualRows,
          ],
        ),
      ),
    );
  }
}
