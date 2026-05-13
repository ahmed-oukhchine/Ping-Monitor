<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\Group;
use Illuminate\Http\Request;

class GroupController extends Controller
{
    public function index()
    {
        return response()->json(Group::orderBy('name')->get());
    }

    public function store(Request $request)
    {
        $request->validate([
            'name'  => 'required|string|max:50',
            'color' => 'required|string|max:20',
        ]);

        $group = Group::create($request->only('name', 'color'));
        AuditLog::log('created', 'group', $group->id, null, $group->toArray());
        return response()->json($group, 201);
    }

    public function update(Request $request, Group $group)
    {
        $request->validate([
            'name'  => 'required|string|max:50',
            'color' => 'required|string|max:20',
        ]);

        $old = $group->toArray();
        $group->update($request->only('name', 'color'));
        AuditLog::log('updated', 'group', $group->id, $old, $group->toArray());

        return response()->json($group);
    }

    public function destroy(Group $group)
    {
        AuditLog::log('deleted', 'group', $group->id, $group->toArray());
        $group->delete();

        return response()->json(['deleted' => true]);
    }
}
