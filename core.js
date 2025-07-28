window.addEventListener("DOMContentLoaded", () => {
  const user = JSON.parse(localStorage.getItem("user"));
  if (user) {
    window.currentUser = user;
    if (user.role === "director") {
      AdminData.loadDataFromFirebase().then(() => {
        refreshPipeline();
      });
    } else {
      refreshPipeline();
    }
  }
});
