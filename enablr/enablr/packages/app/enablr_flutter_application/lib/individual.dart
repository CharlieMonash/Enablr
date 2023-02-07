import 'package:enablr_flutter_application/task.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

import 'consts.dart';

class IndividualPage extends StatefulWidget {
  const IndividualPage(
      {super.key,
      required this.individual,
      required this.token,
      required this.revokedCallback});

  final Map<String, dynamic> individual;
  final String token;
  final Function revokedCallback;

  @override
  State<IndividualPage> createState() => MyIndividualPageState();
}

class MyIndividualPageState extends State<IndividualPage> {
  var _reminders = [];
  var _loadedRequest = false;

  _getAllTaskReminders(individual, token, revokeCallback) async {
    var pendingReminders = [];
    setState(() {
      _loadedRequest = true;
    });

    for (var task in individual['tasks']) {
      var taskId = task['task_id'];

      var response =
          await _getReminders(individual, token, taskId, revokeCallback);
      pendingReminders = [...pendingReminders, ...response];
    }

    setState(() {
      _reminders = pendingReminders;
    });
  }

  _getReminders(individual, token, taskId, revokeCallback) async {
    var individualId = individual['individual_id'];
    var twoHoursAgo =
        DateTime.now().millisecondsSinceEpoch - (1000 * 60 * 60 * 2);

    var response = await http.get(
        Uri.parse('$apiURL/prod/device/reminders/$taskId/$twoHoursAgo'),
        headers: {'Authorization': 'Bearer $token'});

    if (response.body == "Revoked") {
      revokeCallback(individualId);
      return [];
    }

    var jsonResponse = jsonDecode(response.body);

    if (response.statusCode == 200) {
      return jsonResponse['reminders'];
    } else {
      return [];
    }
  }

  Function postTaskCompletion(String token, String taskId) =>
      (String note, Map<String, dynamic> reminder) async {
        // var task_id = reminder['task_id'] as String;
        var reminderId = reminder['reminder_id'] as String;
        var due = int.parse(reminder['due'] as String);

        var response = await http.post(
          Uri.parse('$apiURL/prod/device/update-reminder/$taskId'),
          headers: {'Authorization': 'Bearer $token'},
          body: jsonEncode({
            'due': due,
            'note': note,
          }),
        );
        setState(() {
          reminder["completed"] = true;
        });
      };

  @override
  Widget build(BuildContext context) {
    if (!_loadedRequest) {
      _getAllTaskReminders(
          widget.individual, widget.token, widget.revokedCallback);
    }
    Map<String, dynamic> details =
        widget.individual['details'] as Map<String, dynamic>;

    List<dynamic> tasks = (widget.individual['tasks'] as List<dynamic>);

    String firstName = details['firstName'] as String;
    String lastName = details['lastName'] as String;

    _reminders
        .sort((b, a) => (a["due"] as String).compareTo(b["due"] as String));

    var reminderTimes = _reminders.map((reminder) {
      String reminderId = reminder['reminder_id'] as String;
      Map<String, dynamic> task = tasks.firstWhere((task) {
        String taskId = task['task_id'] as String;
        String reminderTaskId = reminder['task_id'];
        return taskId == reminderTaskId;
      }, orElse: () => null);
      reminder['details'] = task['details']!;
      return TaskWidget(
        reminder: reminder,
        completeTaskCallback: postTaskCompletion(widget.token, task['task_id']),
      );
    });

    return Scaffold(
      appBar: AppBar(
        title: Text("$firstName $lastName"),
      ),
      body: RefreshIndicator(
          color: Colors.white,
          backgroundColor: Colors.blue,
          onRefresh: () async {
            await _getAllTaskReminders(
                widget.individual, widget.token, widget.revokedCallback);
          },
          child: ListView(
            shrinkWrap: true,
            children: _loadedRequest
                ? reminderTimes.toList()
                : [CircularProgressIndicator()],
          )),
    );
  }
}
