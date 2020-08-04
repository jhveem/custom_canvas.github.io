(async function () {
  //https://btech.instructure.com/courses/498455/accredidation
  let rCheckInCourse = /^\/courses\/([0-9]+)\/accredidation/;
  if (rCheckInCourse.test(window.location.pathname)) {
    add_javascript_library("https://cdnjs.cloudflare.com/ajax/libs/printThis/1.15.0/printThis.min.js");
    let CURRENT_COURSE_ID = parseInt(window.location.pathname.match(rCheckInCourse)[1]);
    //add in a selector for all students with their grade then only show assignments they've submitted so far???
    $("#content").html(`
      <div id='accredidation'>
        <div>
          <div v-for='group in assignmentGroups'>
            <h2>{{group.name}}</h2>
            <div v-for='assignment in getSubmittedAssignments(group.assignments)'>
              <i class='icon-download' style='cursor: pointer;' @click='openModal(assignment)'></i> <a target='#' v-bind:href="'/courses/'+courseId+'/assignments/'+assignment.id">{{assignment.name}}</a>
            </div>
          </div>
        </div>

        <div v-if='showModal' class='btech-modal' style='display: inline-block;'>
          <div class='btech-modal-content'>
            <div style='float: right; cursor: pointer;' v-on:click='close()'>X</div>
            <div class='btech-modal-content-inner'>
              <h2>{{currentAssignment.name}}</h2>
              <div v-for='submission in submissions'>
                <i class='icon-download' style='cursor: pointer;' @click='downloadSubmission(currentAssignment, submission)'></i>
                <a target='#' v-bind:href="'/courses/'+courseId+'/assignments/'+currentAssignment.id+'/submissions/'+submission.user.id">{{submission.user.name}} ({{Math.round(submission.grade / currentAssignment.points_possible * 1000) / 10}}%)</a>
              </div>
            </div>
          </div>
        </div>

      </div>`);
    await $.getScript("https://cdn.jsdelivr.net/npm/vue");
    new Vue({
      el: "#accredidation",
      mounted: async function () {
        let app = this;
        app.courseId = CURRENT_COURSE_ID;
        await $.get("/api/v1/courses/" + app.courseId + "/assignment_groups?include[]=assignments&per_page=100").done(function (data) {
          for (let i = 0; i < data.length; i++) {
            let group = data[i];
            for (let j = 0; j < group.assignments.length; j++) {
              data[i].assignments[j].submissions = [];
            }
          }
          app.assignmentGroups = data;
        });
        let enrollments = await canvasGet("/api/v1/courses/" + app.courseId + "/enrollments", {
          type: [
            'StudentEnrollment'
          ],
          state: [
            'active',
            'completed',
            'inactive'
          ]
        });
        app.enrollments = enrollments;
      },
      data: function () {
        return {
          assignmentGroups: {},
          enrollments: [],
          courseId: null,
          currentUser: '',
          showModal: false,
          submissions: [],
          currentAssignment: {}
        }
      },
      methods: {
        getSubmittedAssignments(assignments) {
          let submittedAssignments = [];
          for (let i = 0; i < assignments.length; i++) {
            let assignment = assignments[i];
            if (assignment.has_submitted_submissions) {

              submittedAssignments.push(assignment);
            }
          }
          return submittedAssignments;
        },
        async downloadSubmission(assignment, submission) {
          let app = this;
          let types = assignment.submission_types;
          if (assignment.quiz_id !== undefined) {
            app.downloadQuiz(assignment, submission);
          }
          if (assignment.rubric != undefined) {
            let url = "/courses/" + app.courseId + "/assignments/" + assignment.id + "/submissions/" + submission.user.id;
            app.createIframe(url, app.downloadRubric, {'submission': submission, 'assignment': assignment});
          }
          if (types.includes("online_upload")) {
            let url = "/api/v1/courses/" + app.courseId + "/assignments/" + assignment.id + "/submissions/" + submission.user.id;
            let assignmentsData = null;
            await $.get(url, function (data) {
              assignmentsData = data;
            });
            for (let i = 0; i < assignmentsData.attachments.length; i++) {
              let attachment = assignmentsData.attachments[i];
              console.log(attachment.url);
              await app.createIframe(attachment.url);
            }
          }
          //check if nothing has been gotten
          if (false) {
            console.log('assignment type undefined');
          }
        },
        async downloadRubric(iframe, content, data) {
          content.find("#rubric_holder").show();
          content.find("#rubric_holder").prepend("<div>Submitted:" + data.submission.submitted_at + "</div>");
          content.find("#rubric_holder").prepend("<div>Student:" + data.submission.user.name+ "</div>");
          content.find("#rubric_holder").prepend("<div>Assignment:" + data.assignment.name+ "</div>");
          content.find("#rubric_holder").css({
            'max-height': '',
            'overflow': 'visible'
          });
          content.find("#rubric_holder").printThis();
        },
        async downloadQuiz(assignment, submission) {
          let app = this;
          let iframe = $('<iframe id="btech-quiz" style="display: none;" src="/courses/' + app.courseId + '/assignments/' + assignment.id + '/submissions/' + submission.user.id + '?preview=1"></iframe>');
          $("#content").append(iframe);
          let content = await getElement("body", "#btech-quiz");
          //update date in the content of the quiz
          content.prepend("<div>Submitted:" + submission.submitted_at + "</div>");
          content.prepend("<div>Student:" + submission.user.name+ "</div>");
          content.prepend("<div>Assignment:" + assignment.name+ "</div>");
          content.printThis();
          $("#btech-quiz").remove();
        },
        async createIframe(url, func = null, data = {}) {
          let app = this;
          let id = genId();
          let elId = 'temp-iframe-' + id
          let iframe = $('<iframe id="' + elId + '" style="display: none;" src="' + url + '"></iframe>');
          $("#content").append(iframe);
          let content = await getElement("body", "#" + elId);
          if (func !== null) {
            func(iframe, content, data);
          }
          $("#" + elId).remove();
        },
        async openModal(assignment) {
          let app = this;
          app.showModal = true;
          app.currentAssignment = assignment;
          app.submissions = [];
          if (assignment.submissions.length == 0) {
            let submissions = await canvasGet("/api/v1/courses/" + app.courseId + "/assignments/" + assignment.id + "/submissions", {
              'include': ['user']
            });
            assignment.submissions = submissions;
          }
          console.log(assignment);
          app.submissions = app.submittedAssignments(assignment.submissions);
          console.log(app.submissions);
        },
        submittedAssignments(submissions) {
          let output = [];
          for (let i = 0; i < submissions.length; i++) {
            let submission = submissions[i];
            if (submission.workflow_state != "unsubmitted") {
              output.push(submission);
            }
          }
          return output;
        },
        close() {
          let app = this;
          app.showModal = false;
        }
      }
    });
    let assignmentData = [];
    for (let i = 0; i < assignmentData.length; i++) {
      let group = assignmentData[i];
      $("#content").append("<h2>" + group.name + " (" + group.group_weight + "%)</h2>");
    }
  }
})();