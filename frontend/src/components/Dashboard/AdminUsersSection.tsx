import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { IoPeople } from "react-icons/io5";
import { UserManagement } from "../UserManagement";

export const AdminUsersSection: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IoPeople className="w-5 h-5" />
          User Management
        </CardTitle>
        <CardDescription>
          Manage system users, roles, and permissions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <UserManagement />
      </CardContent>
    </Card>
  );
};
