const { supabase } = require("./global");

async function getUserFromJWT(jwt) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(jwt);
  if (error) {
    throw error;
  }
  return user;
}

function isAdmin(user) {
  return user.user_metadata.admin === true;
}

async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: password,
  });
  if (error) {
    throw error;
  }
  return data.session;
}

async function logout(jwt) {
  const { error } = await supabase.auth.admin.signOut(jwt);
  if (error) {
    throw error;
  }
}

module.exports = { getUserFromJWT, isAdmin, login, logout };
