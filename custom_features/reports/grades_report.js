(function () {
  class Student {
    constructor(id, name, course_id) {
      this.userId = id;
      this.name = name;
      this.course_id = course_id;
      this.days_in_course = 0;
      this.days_since_last_submission = 0;
      this.section = "";
      this.grade = "N/A";
      this.points = 0;
      this.final_grade = "N/A";
      this.section = "";
      this.enrollment = {};
      this.data = {};
      this.ungraded = 0;
      //this will probably be deleted, but keeping for reference on how to format in vue
      let nameHTML = "<a target='_blank' href='https://btech.instructure.com/users/" + id + "'>" + name + "</a> (<a target='_blank' href='https://btech.instructure.com/courses/" + course_id + "/grades/" + id + "'>grades</a>)";
    }
    processEnrollment() {
      let enrollment = this.enrollment;
      let report_body = $('#btech-report-table-body');
      let start_date = Date.parse(enrollment.created_at);
      let now_date = Date.now();
      let diff_time = Math.abs(now_date - start_date);
      let diff_days = Math.ceil(diff_time / (1000 * 60 * 60 * 24));
      let grades = enrollment.grades;
      let current_score = grades.current_score;
      if (current_score === null) current_score = 0;
      let final_score = grades.final_score;
      if (final_score === null) final_score = 0;

      //update values
      this.days_in_course = diff_days;
      this.grade = current_score;
      this.final_grade = final_score;
      //there might need to be a check to see if this is a numbe
      this.points = Math.round(this.final_grade / this.grade * 100);
    }
  }
  class Column {
    constructor(name, description) {
      this.name = name;
      this.description = description;
      this.average = false;
      this.list = [];
      this.average_element = null;
      this.median_element = null;
      this.sortable_type = '';
      this.hidden = true;
      this.percent = false;
    }
  }
  IMPORTED_FEATURE = {};
  if (true) {
    IMPORTED_FEATURE = {
      initiated: false,
      async _init(params = {}) {
        let vueString = '';
        await $.get('https://jhveem.github.io/custom_features/reports/grades_report.vue', null, function (html) {
          vueString = html.replace("<template>", "").replace("</template>", "");
        }, 'text');
        let canvasbody = $("#application");
        canvasbody.after('<div id="canvas-grades-report-vue"></div>');
        $("#canvas-grades-report-vue").append(vueString);
        this.APP = new Vue({
          el: '#canvas-grades-report-vue',
          mounted: function () {
              this.courseId = ENV.context_asset_string.replace("course_", "");
          },

          data: function () {
            return {
              courseId: null,
              students: {},
              columns: [
                new Column('Name', ''),
                new Column('Section', ''),
                new Column('Grade', ''),
                new Column('Final Grade', ''),
                new Column('Points', ''),
                new Column('Submissions', ''),
                new Column('Days Since Last Submission', ''),
                new Column('Days in Course', ''),
                new Column('Ungraded', '')
              ]
            }
          },

          methods: {
            //
            createGradesReport() {
              let url = "/api/v1/courses/" + this.courseId + "/users?enrollment_state%5B%5D=active";
              url += "&enrollment_state%5B%5D=invited"
              url += "&enrollment_type%5B%5D=student"
              url += "&enrollment_type%5B%5D=student_view";
              url += "&include%5B%5D=avatar_url";
              url += "&include%5B%5D=group_ids";
              url += "&include%5B%5D=enrollments";
              url += "&per_page=100";

              $.get(url, function (data) {
                for (let s = 0; s < data.length; s++) {
                  let studentData = data[s];
                  let userId= studentData.id;
                  let enrollment = null;

                  for (let e = 0; e < studentData.enrollments.length; e++) {
                    if (studentData.enrollments[e].type === "StudentEnrollment") {
                      enrollment = studentData.enrollments[e];
                    }
                  }
                  if (enrollment !== null) {
                    this.students[userId] = new Student(userId, studentData.sortable_name, this.courseId);
                    student = this.students[userId];
                    student.data = studentData;
                    student.enrollment = enrollment;
                    student.processEnrollment();
                    getAssignmentData(student);
                  }
                }
                getSectionData(students, course_id);
                //Set up the bottom data including averages, medians, and other information
                report_foot.append("<tr><td border=0 height=10></td></tr>");
                let average_row = $('<tr id="btech-modal-average"></tr>').appendTo(report_foot);
                let median_row = $('<tr id="btech-modal-median"></tr>').appendTo(report_foot);
                median_row.append('<td style="padding:10px;" colspan=2>MEDIAN</td>');
                average_row.append('<td style="padding:10px;" colspan=2>AVERAGE</td>');
                for (let key in columns) {
                  if (columns[key].average == true) {
                    average_row.append(columns[key].average_element);
                    median_row.append(columns[key].median_element);
                  }
                }

                report_foot.append("<tr><td border=0 height=10></td></tr>");
                let final_row = $('<tr id="btech-modal-report-summary"></tr>').appendTo(report_foot);
                final_row.append("<td style='padding:10px;' colspan=2 title='A projection of the number of days it will take the average student to complete this course based on the time it has take students to reach their current progress.'>PROJECTED AVERAGE DAYS TO COMPLETION</td>");
                final_row.append("<td style='padding:10px; text-align:center;' id='btech-days-to-completion' style='text-align:center;'></td>");

              });
            }
            //
          }
        })
      },
      APP: {}
    }
  }
})();