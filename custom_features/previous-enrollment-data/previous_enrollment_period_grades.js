IMPORTED_FEATURE = {};
if (/^\/courses\/[0-9]+\/grades/.test(window.location.pathname)) {
  IMPORTED_FEATURE = {
    initiated: false,
    courseId: null,
    studentId: null,
    termStartDate: null,
    termEndDate: null,
    studentAssignmentsData: [],
    hours: 0,
    hoursAssignmentData: null,
    hoursEnrolled: null,
    assignmentGroups: {},
    async _init(params = {}) {
      let feature = this;
      this.courseId = ENV.courses_with_grades[0].id;
      this.studentId = ENV.students[0].id;
      this.studentAssignmentsData = [];
      window.STUDENT_HOURS = 0;
      window.TOTAL_HOURS = 0;
      feature.assignmentGroups = await canvasGet("/api/v1/courses/" + feature.courseId + "/assignment_groups", {
        'include': [
          'assignments'
        ]
      });

      //grab the original grades and give it an id for future access
      $("table#grades_summary tbody").attr("id", "btech-original-grades-body");
      //create an empty table where we'll put the grades that were submitted in the specified grade period
      $("table#grades_summary").append("<tbody id='btech-enrollment-grades-body'></tbody>");

      //GET THE USERS ENROLLMENT DATE
      let url, data_obj;
      url = "/api/v1/courses/" + feature.courseId + "/search_users";
      data_obj = {
        include: ["enrollments"],
        user_ids: [feature.studentId],
        enrollment_state: ["active", "invited", "rejected", "completed", "inactive"]
      };
      let enrollmentData = [];
      await $.get(url, data_obj).then(function (data, status, xhr) {
        enrollmentData = enrollmentData.concat(data);
      });

      //SET THEIR DATE INFORMATION
      let enrollmentStartDate = new Date(enrollmentData[0].enrollments[0].updated_at);
      let dateStringEnrollment = enrollmentStartDate.getFullYear() + "-" + ("0" + (enrollmentStartDate.getMonth() + 1)).slice(-2) + "-" + ("0" + enrollmentStartDate.getDate()).slice(-2);
      let dateStringNow = new Date().getFullYear() + "-" + ("0" + (new Date().getMonth() + 1)).slice(-2) + "-" + ("0" + new Date().getDate()).slice(-2);
      feature.termStartDate = enrollmentStartDate;
      feature.termEndDate = dateStringNow;
      //GET THE STUDENT'S SUBMISSIONS FOR THIS COURSE
      feature.studentAssignmentsData = await feature.getSubmissionData();
      //check to see if the student has hours enrolled set up
      feature.createDateSelector(dateStringEnrollment, dateStringNow);
      this.hours = CURRENT_COURSE_HOURS;
      window.TOTAL_HOURS = CURRENT_COURSE_HOURS;
    },
    createDateSelector(dateStringEnrollment, dateStringNow) {
      let feature = this;
      //edit so the note does not appear if a student
      $("#student-grades-right-content").append(
        `<div id="btech-submissions-between-dates-module">
          <br><br>
          <div id="btech-term-teacher-view">
            <h2>Grade for Submissions Between Dates</h2> 
            <p><b>Note:</b>Canvas only tracks the most recent submission, so regraded assignments will only be included in the date range for its most recent submission.</p>
            <div id="btech-student-hours">
            </div>
            <p>Start Date</p>
            <input type="date" id="btech-term-grade-start" name="term-start" value="` + dateStringEnrollment + `" min="2010-01-01" max="2020-12-31">
            <p>End Date</p>
            <input type="date" id="btech-term-grade-end" name="term-end" value="` + dateStringNow + `" min="2010-01-01" max="2020-12-31">
          </div>
          <div id="btech-term-student-view">
            <h2>Term Grade</h2> 
            <p><b>Note:</b>If you are enrolled as a highscool student, your grade may be based on assignments completed during a certain period of time, not all assignments in the course. Click Estimate below to estimate your grade for the current enrollment period.</p>
          </div>
          <button class="Button" id="btech-term-grade-button">Estimate</button>
          <button class="Button" id="btech-term-reset-button">Reset</button>
          <div id="btech-term-output-container">
            <div id="btech-term-grade-value"></div>
            <div id="btech-term-hours-completed"></div>
            <div id="btech-term-hours-warning"></div>
            <div id="btech-term-ungraded-value"></div>
            <div id="btech-term-grade-weighted-value"></div>
          </div>
        </div>`
      );
      //hide the two views
      $('#btech-term-student-view').hide();
      $('#btech-term-teacher-view').hide();
      $('#btech-term-ungraded-value').hide(); //Not currently used. Will need to come up with a way of making this only show up if needed
      $('#btech-term-grade-weighted-value').hide();
      $('#btech-term-hours-warning').hide();
      //if teacher, show teacher stuff, if student AND enrolled for hours, show student stuff, else, hide everything
      if (IS_TEACHER) $('#btech-term-teacher-view').show();
      if (this.hoursEnrolled !== null) {
        if (!IS_TEACHER) $('#btech-term-student-view').show();
      } else {
        $('#btech-submissions-between-dates-module').hide();
      }

      //set up the buttons
      $("#btech-term-grade-button").on("click", function () {
        let startDate = feature.parseDate($("#btech-term-grade-start").val());
        feature.termStartDate = startDate;
        let endDate = feature.parseDate($("#btech-term-grade-end").val());
        feature.termEndDate = endDate;
        feature.calcEnrollmentGrade(feature.studentAssignmentsData, startDate, endDate);
      });

      $("#btech-term-reset-button").on("click", function () {
        let originalBody = $("#btech-original-grades-body");
        originalBody.show();
        let newBody = $("#btech-enrollment-grades-body");
        newBody.empty();
        newBody.hide();
        //empty all the output divs
        $("#btech-term-term-output-container div").each(function () {
          $(this).empty();
        });
      });
    },
    calcEnrollmentGrade(studentAssignmentsData, startDate, endDate) {
      let feature = this;
      //make sure there's any submissions to work with for this course
      let subs = feature.studentAssignmentsData;
      if (subs !== undefined) {
        //get the data for all submissions that are available and organize by assignment_id
        let subData = {};
        for (let s = 0; s < subs.length; s++) {
          let sub = subs[s];
          if (sub.posted_at != null) {
            subData[sub.assignment_id] = sub;
          }
        }
        //reset display of assigment elements
        let originalBody = $("#btech-original-grades-body");
        originalBody.hide();
        let newBody = $("#btech-enrollment-grades-body");
        newBody.empty();
        newBody.show();
        $("#btech-term-output-container div").each(function () {
          $(this).empty();
        })

        //figure out which assignments should be included
        let includedAssignments = [];
        for (let i = 0; i < studentAssignmentsData.length; i++) {
          let submission = studentAssignmentsData[i];
          let date = new Date(submission.graded_at);
          if (date >= startDate && date <= endDate) {
            includedAssignments.push(submission.assignment_id);
          }
        }

        //Go through each assignment group and figure out the points value of the included assignments that are in those groups
        let assignmentGroups = feature.assignmentGroups;
        let finalScore = 0;
        let finalTotalScore = 0;
        //used for figuring out scores if using hours enrolled
        let finalPoints = 0;
        let finalUngradedAsZero = 0;
        let totalProgress = 0;
        let totalWeights = 0;
        //loop assignments
        for (let i = 0; i < assignmentGroups.length; i++) {
          let group = assignmentGroups[i];
          if (group.group_weight > 0) {
            let score = 0;
            let possiblePoints = 0;
            let totalPoints = 0;
            let assignments = group.assignments;
            for (let a = 0; a < assignments.length; a++) {
              let assignment = assignments[a];
              if (assignment.published) {
                let id = parseInt(assignment.id);
                let submissionElement = $("#submission_" + id);
                totalPoints += assignment.points_possible;
                if (assignment.id in subData) {
                  let sub = subData[assignment.id];
                  let subDateString = sub.submitted_at;
                  if (subDateString === null) subDateString = sub.graded_at;
                  let subDate = new Date(subDateString);
                  if (subDate >= feature.termStartDate && subDate <= feature.termEndDate) {
                    submissionElement.clone().appendTo(newBody);
                    score += sub.score;
                    finalPoints += (sub.score * group.group_weight);
                    possiblePoints += assignment.points_possible;
                  }
                } else {
                  //console.log($("#submission_"+id).html());
                }
              }
            }
            if (possiblePoints > 0) {
              let groupPerc = (score / possiblePoints);
              let groupUngradedAsZeroPerc = (score / totalPoints);
              finalTotalScore += group.group_weight;
              finalScore += (groupPerc * group.group_weight);
              finalUngradedAsZero += (groupUngradedAsZeroPerc * group.group_weight);
            }
            if (totalPoints > 0) {
              let progress = possiblePoints / totalPoints;
              totalProgress += progress * group.group_weight;
              totalWeights += group.group_weight;
            }
          }
        }
        let outputScore = finalScore / finalTotalScore;
        let outputUngradedAsZeroScore = finalUngradedAsZero / finalTotalScore;
        outputUngradedAsZeroScore *= 100;

        if (isNaN(outputScore)) {
          outputScore = "N/A";
        } else {
          let weightedGrade = outputScore; //has to be set here before it's all messed up, the rest dealing with weighted is done after making sure hoursEnrolled exists
          let gradingScheme = ENV.grading_scheme;
          $("#btech-term-ungraded-value").html("<b>Ungraded as Zero:</b> " + toPrecision(outputUngradedAsZeroScore, 2) + "%");

          let letterGrade = null;
          if (outputScore >= gradingScheme[0][1]) letterGrade = gradingScheme[0][0];
          else {
            for (var g = 1; g < gradingScheme.length; g++) {
              let max = gradingScheme[g - 1][1];
              let min = gradingScheme[g][1];
              if (outputScore >= min && outputScore < max) {
                letterGrade = gradingScheme[g][0];
              }
            }
          }
          outputScore *= 100;
          outputScore = toPrecision(outputScore, 2) + "% (" + letterGrade + ")";
          if (feature.hoursEnrolled !== null) {

            let percCompleted = (totalProgress / totalWeights);
            let hoursCompleted = toPrecision((feature.hours * percCompleted), 2);
            let minHoursRequired = feature.hoursEnrolled * .66;
            if (hoursCompleted < minHoursRequired) {
              weightedGrade *= (hoursCompleted / minHoursRequired);
            }
            weightedGrade = toPrecision(weightedGrade, 2);
            $("#btech-term-hours-completed").html("<div><b>Hours Completed</b> " + hoursCompleted + " / " + feature.hoursEnrolled + " (" + toPrecision((hoursCompleted / feature.hoursEnrolled) * 100) + "%)</div>");
            if (hoursCompleted < minHoursRequired) {
              let warning = $("<i class='icon-warning'></i>");
              $("#btech-term-hours-completed").append(warning);
              warning.click
              $("#btech-term-hours-warning").append("<br><div><b>WARNING:</b> If you were to end your course with your current hours completed, your Term Grade would be reduced to the following score: " + weightedGrade + "%</div>");
            }
          }
        }
        $("#btech-term-grade-value").html("<b>Term Grade:</b> " + outputScore);
      }
    },
    parseDate(dateString) {
      let pieces = dateString.split("-");
      let year = parseInt(pieces[0]);
      let month = parseInt(pieces[1] - 1);
      let day = parseInt(pieces[2]) + 1;
      let date = new Date(year, month, day);
      return date;
    },
    async getSubmissionData() {
      let feature = this;
      let subs = await canvasGet("/api/v1/courses/" + feature.courseId + "/students/submissions", {
        'student_ids': [feature.studentId],
        'include': ['assignment']
      })
      this.hoursAssignmentData = null;
      for (let s = 0; s < subs.length; s++) {
        let sub = subs[s];
        let assignment = sub.assignment;
        if (assignment.name.toLowerCase() === "hours") {
          //in ind report this looks through the grade activity stream, but student doesn't have access to this
          //will likely need to be fixed there if student is to have access to that
          //need a new way to get historic grade data of hours
          //also can just do a check if a teacher, get historic, otherwise, student is stuck with most recent
          feature.hoursAssignmentData = assignment;
          feature.hoursEnrolled = sub.score;
        }
      }
      return subs;
    },
  }
}