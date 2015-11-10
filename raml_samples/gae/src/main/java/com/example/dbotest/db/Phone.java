// This file is generated.
// please don't edit it manually.

package com.example.dbotest.db;
	

import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.Basic;

/**
 * 
 */
@Entity
class Phone{
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