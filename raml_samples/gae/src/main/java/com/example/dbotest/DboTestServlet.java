
package com.example.dbotest;

import com.google.appengine.api.users.User;
import com.google.appengine.api.users.UserService;
import com.google.appengine.api.users.UserServiceFactory;

import java.io.IOException;
import java.util.Properties;

import com.example.dbotest.db.Person;

import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import com.googlecode.objectify.ObjectifyService;

public class DboTestServlet extends HttpServlet {

  @Override
  public void doGet(HttpServletRequest req, HttpServletResponse resp)
      throws IOException {

    Person u = new Person();

    ObjectifyService.ofy().save().entity(u).now();

    resp.setContentType("text/plain");
    resp.getWriter().println("Hello, this is a testing servlet. \n\n");

    resp.getWriter().close();

  }
}