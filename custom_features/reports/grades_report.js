(function () {

  class Column {
    constructor(name, description, average, sortable_type, percent) {
      this.name = name;
      this.description = description;
      this.average = average;
      this.sortable_type = sortable_type;
      this.hidden = true;
      this.percent = percent;
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
          mounted: async function () {
            this.courseId = ENV.context_asset_string.replace("course_", "");
            this.students = await this.createGradesReport();
          },

          data: function () {
            return {
              courseId: null,
              students: {},
              columns: [
                new Column('Name', '', false, '', false),
                new Column('Section', '', false, '', false),
                new Column('Grade', '', true, 'sorttable_numeric', true),
                new Column('Final Grade', '', true, 'sorttable_numeric', true),
                new Column('Points', '', true, 'sorttable_numeric', true),
                new Column('Submissions', '', true, 'sorttable_numeric', true),
                new Column('Days Since Last Submission', '', true, 'sorttable_numeric', false),
                new Column('Days in Course', '', true, 'sorttable_numeric', false),
                new Column('Ungraded', '', true, 'sorttable_numeric', false)
              ],
              sections: [],
              studentData: [],
            }
          },
          watch: {
            students: {
              handler: function (val, oldval) {
                
                console.log(oldval);
                console.log(val);
              },
              deep: true
            }
          },
          methods: {
            newStudent(id, name, course_id) {
              let student = {};
              student.user_id = id;
              student.name = name;
              student.course_id = course_id;
              student.days_in_course = 0;
              student.days_since_last_submission = 0;
              student.days_since_last_submission_color = "#fff";
              student.section = "";
              student.grade = "N/A";
              student.points = 0;
              student.final_grade = "N/A";
              student.section = "";
              student.ungraded = 0;
              student.submissions = 0;
              //this will probably be deleted, but keeping for reference on how to format in vue
              let nameHTML = "<a target='_blank' href='https://btech.instructure.com/users/" + id + "'>" + name + "</a> (<a target='_blank' href='https://btech.instructure.com/courses/" + course_id + "/grades/" + id + "'>grades</a>)";
              return student;
            },
            async createGradesReport() {
              let app = this;
              let studentsData = {};
              await app.getSectionData();
              let url = "/api/v1/courses/" + this.courseId + "/users?enrollment_state%5B%5D=active";
              url += "&enrollment_state%5B%5D=invited"
              url += "&enrollment_type%5B%5D=student"
              url += "&enrollment_type%5B%5D=student_view";
              url += "&include%5B%5D=avatar_url";
              url += "&include%5B%5D=group_ids";
              url += "&include%5B%5D=enrollments";
              url += "&per_page=100";

              await $.get(url, function (data) {
                app.studentData = data;
              });

              for (let s = 0; s < app.studentData.length; s++) {
                let studentData = app.studentData[s];
                let userId = studentData.id;
                let enrollment = null;

                for (let e = 0; e < studentData.enrollments.length; e++) {
                  if (studentData.enrollments[e].type === "StudentEnrollment") {
                    enrollment = studentData.enrollments[e];
                  }
                }
                if (enrollment !== null) {
                  studentsData[userId] = app.newStudent(userId, studentData.sortable_name, app.courseId, app);
                  app.processEnrollment(studentsData[userId], enrollment);
                  await app.getAssignmentData(studentsData[userId], enrollment);
                }
              }
              console.log(studentsData);

              return studentsData;
            },
            async getSectionData(students) {
              let app = this;
              let url = "/api/v1/courses/" + app.courseId + "/sections?per_page=100&include[]=students";
              await $.get(url, function (data) {
                app.sections = data;
              });
            },
            getStudentSection(studentId) {
              if (app.sections.length > 0) {
                for (let i = 0; i < sections.length; i++) {
                  let section = sections[i];
                  let studentsData = section.students;
                  if (studentsData !== null) {
                    if (studentsData.length > 0) {
                      for (let j = 0; j < studentsData.length; j++) {
                        let studentData = studentsData[j];
                        if (parseInt(studentId) === studentData.id) {
                          return section.name;
                        }
                      }
                    }
                  }
                }
              }
              return '';
            },

            checkStudentInSection(studentData, section) {
              let app = this;
              for (let id in app.students) {
                let student = app.students[id];
                let user_id = parseInt(student.user_id);
                if (studentData.id === user_id) {
                  student.section = section.name;
                  return;
                }
              }
            },
            columnNameToCode(name) {
              return name.toLowerCase().replace(/ /g, "_");
            },
            getColumnText(column, text) {
              if (column.percent && !isNaN(text)) {
                text += "%";
              }
              return text;
            },
            getDaysSinceLastSubmissionColor(column, val) {
              color = "#FFF";
              if (column === "Days Since Last Submission") {
                if (val >= 7 && val <= 21) {
                  let g = 16 - Math.floor(((val - 6) / 15) * 16);
                  if (g < 6) g = 6;
                  color = "#F" + g.toString(16) + "7";
                }
                if (val > 21) color = "#F67";
              }
              return color;
            },
            processEnrollment(student, enrollment) {
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
              student.days_in_course = diff_days;
              student.grade = current_score;
              student.final_grade = final_score;
              //there might need to be a check to see if this is a numbe
              if (student.grade > 0 && student.grade != null) {
                student.points = Math.round(student.final_grade / student.grade * 100);
              }
            },

            async getAssignmentData(student, enrollment) {
              let user_id = student.user_id;
              let course_id = student.course_id;
              let url = "/api/v1/courses/" + course_id + "/analytics/users/" + user_id + "/assignments?per_page=100";
              await $.get(url, function (data) {
                let assignments = data;
                let most_recent = {};
                let submitted = 0;
                let max_submissions = 0;
                let progress_per_day = 0;
                let start_date = Date.parse(enrollment.created_at);
                let now_date = Date.now();
                let diff_time = Math.abs(now_date - start_date);
                let diff_days = Math.ceil(diff_time / (1000 * 60 * 60 * 24));
                let most_recent_time = diff_time;
                let ungraded = 0;

                for (let a = 0; a < assignments.length; a++) {
                  let assignment = assignments[a];
                  if (assignment.submission !== undefined) {
                    let submitted_at = Date.parse(assignment.submission.submitted_at);
                    if (assignment.points_possible > 0) {
                      max_submissions += 1;
                      if (assignment.submission.score !== null) {
                        submitted += 1;
                      }
                    }
                    if (assignment.submission.score === null && assignment.submission.submitted_at !== null) {
                      ungraded += 1;
                    }
                    if (Math.abs(now_date - submitted_at) < most_recent_time) {
                      most_recent_time = Math.abs(now_date - submitted_at);
                      most_recent = assignment;
                    }
                  }
                }

                let points = student.points;
                let most_recent_days = Math.ceil(most_recent_time / (1000 * 60 * 60 * 24));
                progress_per_day = points / diff_days;
                progress_per_day_list.push(progress_per_day);
                let sum_progress = 0;
                for (let i = 0; i < progress_per_day_list.length; i++) {
                  sum_progress += progress_per_day_list[i];
                }
                student.days_since_last_submission = most_recent_days;

                let average_progress_per_day = sum_progress / progress_per_day_list.length;
                let average_days_to_complete = Math.floor(100 / average_progress_per_day);
                student.ungraded = ungraded;
                let perc_submitted = Math.round((submitted / max_submissions) * 100);
                if (isNaN(perc_submitted)) perc_submitted = 0;
                student.submissions = perc_submitted;
              });
            }

          }
        })
      },
      APP: {}
    }
  }

  console.log('v12')
})();