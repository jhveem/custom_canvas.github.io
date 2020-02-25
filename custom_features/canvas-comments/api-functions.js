CANVAS_COMMENTS_API = {
  URL_BASE: "https://jhveem.xyz/api/",
  async getProjects(courseId) {
    let self = this;
    let url = self.URL_BASE + "projects/courses/" + courseId;
    let returnData = null;
    await $.get(url).done(function(data) {
      returnData = data;
    });
    return returnData;
  },
  async createProject(courseId, name) {
    let self = this;
    let url = self.URL_BASE + "projects/courses/" + courseId;
    let returnData = null;
    await $.post(url, {
      'name': name,
      'course': courseId
    }).done(function(data) {
      console.log(data);
      returnData = data;
    });
    return returnData;
  },
  async createTodo(projectId, name, pageTypes = ['']) {
    let self = this;
    let url = self.URL_BASE + "projects/" + projectId + "/todo";
    let returnData = null;
    await $.post(url, {
      'name': name,
      'pageTypes': pageTypes
    }, function (data) {
      returnData = data;
    });
    return returnData;
  },
  async completeTodoPage(todoId, pageType, pageId) {
    let self = this;
    let url = self.URL_BASE + "todos/" + todoId + "/complete";
    let returnData = null;
    await $.post(url, {
      'pageType': pageType,
      'pageId': pageId
    }, function(data) {
      returnData = data;
    });
    return returnData;
  },
  async uncompleteTodoPage(todoId, pageType, pageId) {
    let self = this;
    let url = self.URL_BASE + "todos/" + todoId + "/uncomplete";
    let returnData = null;
    await $.post(url, {
      'pageType': pageType,
      'pageId': pageId
    }, function(data) {
      returnData = data;
    });
    return returnData;
  },
  async createComment(projectId, courseId, pageType, pageId, text) {
    let self = this;
    let url = self.URL_BASE + "projects/" + projectId + "/pages/" + pageType + "/" + pageId + "/comment";
    return $.post(url, {
      'text': text,
      'course': courseId,
      'user': ENV.current_user_id
    }, function (data) {
      console.log(data);
    });
  },
  async getComments(projectId, pageType, pageId) {
    let self = this;
    let url = self.URL_BASE + "projects/" + projectId + "/pages/" + pageType + "/" + pageId + "/comments";
    return $.get(url, function (data) {
      console.log(data);
    });
  },
  async updateComment(commentId, data) {
    let self = this;
    let url = self.URL_BASE + "comments/" + commentId;
    return $.put(url, data);
  }
}