// This file is generated.
// please don't edit it manually.

package com.example.dbotest.db;
	

import com.googlecode.objectify.annotation.Entity;
import com.googlecode.objectify.annotation.Id;
import com.googlecode.objectify.annotation.Index;
import com.googlecode.objectify.annotation.Parent;
import com.googlecode.objectify.Key;

/**
 * 
 */
@Entity
public class Phone{
	// Properties:
	private String code;
	private String number;
	
	// Getters:
	public String getCode() { 
		return code;
	};
	public String getNumber() { 
		return number;
	};
	
	// Setters:
	public void setCode(String code) { 
		this.code=code;
	};
	public void setNumber(String number) { 
		this.number=number;
	};
}