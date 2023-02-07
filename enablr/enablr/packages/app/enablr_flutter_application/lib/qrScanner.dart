import 'dart:io';

import 'package:enablr_flutter_application/consts.dart';
import 'package:flutter/material.dart';

import 'package:device_info_plus/device_info_plus.dart';

import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

class QRPage extends StatefulWidget {
  const QRPage({super.key, required this.title, required this.callback});

  final String title;
  final Function callback;

  @override
  State<QRPage> createState() => QRPageState();
}

class QRPageState extends State<QRPage> {
  String _qrCode = '';
  String _deviceName = "";
  String _token = '';
  String _error = '';
  bool _requesting = false;

  _upateQRCode(code) {
    setState(() {
      _qrCode = code;
    });
  }

  _updateDeviceName(name) {
    setState(() {
      _deviceName = name;
    });
  }

  _reset() {
    setState(() {
      _qrCode = '';
      _deviceName = "";
      _token = '';
      _error = '';
      _requesting = false;
    });
  }

  Future<String?> _getId() async {
    var deviceInfo = DeviceInfoPlugin();
    if (Platform.isIOS) {
      // import 'dart:io'
      var iosDeviceInfo = await deviceInfo.iosInfo;
      return iosDeviceInfo.identifierForVendor; // unique ID on iOS
    } else if (Platform.isAndroid) {
      var androidDeviceInfo = await deviceInfo.androidInfo;
      return androidDeviceInfo.id; // unique ID on Android
    }
  }

  _makeQRRequest(Function callback) async {
    var deviceId = await _getId();

    setState(() {
      _requesting = true;
    });
    var response = await http.post(
      Uri.parse('$apiURL/prod/register/device'),
      body: jsonEncode({
        'registrationId': _qrCode,
        'deviceName': _deviceName,
        'deviceId': deviceId
      }),
    );
    if (response.body == "Registration expired or invalid") {
      setState(() {
        _requesting = false;
        _error = response.body;
      });
      return;
    }

    var jsonResponse = jsonDecode(response.body);

    var token = jsonResponse['token'];

    setState(() {
      _requesting = false;
      _token = token;
    });
    callback(token, null);
  }

  @override
  Widget build(BuildContext context) {
    double cameraSize =
        MediaQuery.of(context).size.width < MediaQuery.of(context).size.height
            ? MediaQuery.of(context).size.width / 1.3
            : MediaQuery.of(context).size.height / 1.3;

    Widget page;

    var input = Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(children: [
          TextField(
            onChanged: ((value) => _updateDeviceName(value)),
            decoration: InputDecoration(
              border: OutlineInputBorder(),
              hintText: 'Enter a device name',
            ),
          ),
          ElevatedButton(
            onPressed: (_requesting || _deviceName.length < 3
                ? null
                : () => _makeQRRequest(widget.callback)),
            // tooltip: 'Increment',
            child: const Text('Register'),
          )
        ]));

    if (_qrCode == "") {
      page = SizedBox(
        width: cameraSize,
        height: cameraSize,
        child: MobileScanner(
            allowDuplicates: false,
            onDetect: (barcode, args) {
              if (barcode.rawValue == null) {
                debugPrint('Failed to scan Barcode');
              } else {
                final String code = barcode.rawValue!;
                _upateQRCode(code);
              }
            }),
      );
    } else {
      page = Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: <Widget>[
          (_token.length != 0 || _error.length != 0)
              ? Text(
                  _error.length > 0 ? _error : 'Token valid. Loading data...')
              : _requesting
                  ? CircularProgressIndicator()
                  : input,
          ElevatedButton(
            onPressed: (_reset),
            // tooltip: 'Increment',
            child: const Text('Reset'),
          ),
        ],
      );
    }

    return Scaffold(
      appBar: AppBar(
        // Here we take the value from the MyHomePage object that was created by
        // the App.build method, and use it to set our appbar title.
        title: Text(widget.title),
      ),
      body: Center(
        // Center is a layout widget. It takes a single child and positions it
        // in the middle of the parent.
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: <Widget>[
            const Text(
              'On the individuals admin page, scan the QR code to link this device',
            ),
            const SizedBox(height: 30),
            page
          ],
        ),
      ),
    );
  }
}
