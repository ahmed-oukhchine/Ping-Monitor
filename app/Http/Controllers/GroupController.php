<?php

namespace App\Http\Controllers;

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

        return response()->json(Group::create($request->only('name', 'color')), 201);
    }

    public function update(Request $request, Group $group)
    {
        $request->validate([
            'name'  => 'required|string|max:50',
            'color' => 'required|string|max:20',
        ]);

        $group->update($request->only('name', 'color'));

        return response()->json($group);
    }

    public function destroy(Group $group)
    {
        $group->delete();

        return response()->json(['deleted' => true]);
    }
}
