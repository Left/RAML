
package com.example.dbotest;

import com.google.appengine.api.users.User;
import com.google.appengine.api.users.UserService;
import com.google.appengine.api.users.UserServiceFactory;

import java.io.IOException;
import java.util.Properties;

import javax.jdo.PersistenceManager;

import com.example.dbotest.db.Person;

import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

public class DboTestServlet extends HttpServlet {

  @Override
  public void doGet(HttpServletRequest req, HttpServletResponse resp)
      throws IOException {

    PersistenceManager pm = PMFactory.get().getPersistenceManager();

    Person u = new Person();
    pm.makePersistent(u);
    pm.close();

    resp.setContentType("text/plain");
    resp.getWriter().println("Hello, this is a testing servlet. \n\n");

    resp.getWriter().close();

  }
}